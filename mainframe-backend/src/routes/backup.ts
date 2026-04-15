import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { buildHmacHeaders } from '../lib/hmac';
// googleapis loaded lazily so a missing package doesn't crash the server
let googleLib: typeof import('googleapis') | null = null;
async function getGoogle() {
  if (!googleLib) {
    try { googleLib = await import('googleapis'); }
    catch { throw new Error('googleapis package not installed — run: npm install googleapis in mainframe-backend/'); }
  }
  return googleLib;
}

const router = Router();
router.use(requireAuth);

// ── Config ───────────────────────────────────────────────────────────────────

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
const POS_BACKEND_URL = process.env.POS_BACKEND_URL || 'http://localhost:3000/api/v1';
const MAINFRAME_DB_URL = process.env.DATABASE_URL || '';
const POS_DB_URL = process.env.POS_DATABASE_URL || '';
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// ── Helpers ───────────────────────────────────────────────────────────────────

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/** Run pg_dump for a given DATABASE_URL, save to file, resolve with filepath */
function pgDump(databaseUrl: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Parse connection string
    let url: URL;
    try {
      url = new URL(databaseUrl);
    } catch {
      return reject(new Error('Invalid DATABASE_URL'));
    }

    const env = {
      ...process.env,
      PGPASSWORD: decodeURIComponent(url.password),
    };

    const args = [
      '-h', url.hostname,
      '-p', url.port || '5432',
      '-U', decodeURIComponent(url.username),
      '-d', url.pathname.slice(1),
      '-F', 'p',   // plain SQL
      '--no-owner',
      '--no-acl',
      '-f', outputPath,
    ];

    const proc = spawn('pg_dump', args, { env });
    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump exited ${code}: ${stderr}`));
    });
  });
}

/** Call POS backend internal API, return parsed JSON */
function callPOS<T>(urlPath: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const urlStr = `${POS_BACKEND_URL}${urlPath}`;
    let url: URL;
    try { url = new URL(urlStr); }
    catch (e) { return reject(new Error(`Invalid POS_BACKEND_URL: ${POS_BACKEND_URL}`)); }

    const mod = url.protocol === 'https:' ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: { ...buildHmacHeaders('') },
      timeout: 30000,
    };
    const req = mod.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if ((res.statusCode || 200) >= 400) {
          return reject(new Error(`POS backend returned ${res.statusCode}: ${data.slice(0, 200)}`));
        }
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`POS backend returned non-JSON (status ${res.statusCode}): ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', (e) => reject(new Error(`Cannot reach POS backend at ${POS_BACKEND_URL}: ${e.message}`)));
    req.on('timeout', () => { req.destroy(); reject(new Error('POS backend request timed out after 30s')); });
    req.end();
  });
}

/** Upload a local file to Google Drive, returns the web link */
async function uploadToDrive(filePath: string, driveFolder: string, mimeType = 'application/octet-stream'): Promise<string> {
  if (!SERVICE_ACCOUNT_JSON) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON env var not set');
  const { google } = await getGoogle();
  const credentials = JSON.parse(Buffer.from(SERVICE_ACCOUNT_JSON, 'base64').toString('utf8'));
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.file'] });
  const drive = google.drive({ version: 'v3', auth });
  const filename = path.basename(filePath);

  const file = await drive.files.create({
    requestBody: { name: filename, parents: [driveFolder] },
    media: { mimeType, body: fs.createReadStream(filePath) },
    fields: 'id,webViewLink',
  });
  return file.data.webViewLink || `https://drive.google.com/file/d/${file.data.id}/view`;
}

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /mainframe/backup/status — drive + pg_dump availability */
router.get('/status', (_req, res) => {
  res.json({
    driveConfigured: !!SERVICE_ACCOUNT_JSON && !!DRIVE_FOLDER_ID,
    posDbConfigured: !!POS_DB_URL,
    mainframeDbConfigured: !!MAINFRAME_DB_URL,
    backupDir: BACKUP_DIR,
  });
});

/** GET /mainframe/backup/list — list all saved backup files */
router.get('/list', (_req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql') || f.endsWith('.json') || f.endsWith('.sql.gz'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { filename: f, size: stat.size, createdAt: stat.birthtime.toISOString() };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(files);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/** POST /mainframe/backup/mainframe-db — pg_dump the mainframe DB */
router.post('/mainframe-db', async (req: Request, res: Response) => {
  if (!MAINFRAME_DB_URL) return res.status(400).json({ message: 'DATABASE_URL not configured' });

  const toDrive = req.query.drive === 'true';
  const filename = `mainframe-${timestamp()}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  try {
    await pgDump(MAINFRAME_DB_URL, filepath);

    if (toDrive) {
      if (!DRIVE_FOLDER_ID) return res.status(400).json({ message: 'GOOGLE_DRIVE_FOLDER_ID not configured' });
      const link = await uploadToDrive(filepath, DRIVE_FOLDER_ID, 'application/sql');
      return res.json({ message: 'Uploaded to Google Drive', filename, driveLink: link });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const stream = fs.createReadStream(filepath);
    stream.pipe(res);
    stream.on('end', () => { try { fs.unlinkSync(filepath); } catch (_e) { /* temp file already gone */ } });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/** POST /mainframe/backup/pos-full — pg_dump the full POS DB */
router.post('/pos-full', async (req: Request, res: Response) => {
  if (!POS_DB_URL) return res.status(400).json({ message: 'POS_DATABASE_URL not configured' });

  const toDrive = req.query.drive === 'true';
  const filename = `pos-full-${timestamp()}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  try {
    await pgDump(POS_DB_URL, filepath);

    if (toDrive) {
      if (!DRIVE_FOLDER_ID) return res.status(400).json({ message: 'GOOGLE_DRIVE_FOLDER_ID not configured' });
      const link = await uploadToDrive(filepath, DRIVE_FOLDER_ID, 'application/sql');
      return res.json({ message: 'Uploaded to Google Drive', filename, driveLink: link });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const stream = fs.createReadStream(filepath);
    stream.pipe(res);
    stream.on('end', () => { try { fs.unlinkSync(filepath); } catch (_e) { /* temp file already gone */ } });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/** POST /mainframe/backup/pos-tenant/:slug — export one tenant's data as JSON */
router.post('/pos-tenant/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;
  const toDrive = req.query.drive === 'true';

  try {
    // Get tenant ID from POS backend
    const tenants = await callPOS<{ id: string; subdomain: string; name: string }[]>('/internal/backup/tenants');
    const tenant = tenants.find(t => t.subdomain === slug);
    if (!tenant) return res.status(404).json({ message: `Tenant "${slug}" not found` });

    // Export tenant data from POS backend
    const urlStr = `${POS_BACKEND_URL}/internal/backup/tenant/${tenant.id}`;
    const url = new URL(urlStr);
    const mod = url.protocol === 'https:' ? https : http;

    const filename = `tenant-${slug}-${timestamp()}.json`;
    const filepath = path.join(BACKUP_DIR, filename);
    const fileStream = fs.createWriteStream(filepath);

    await new Promise<void>((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'GET',
        headers: { ...buildHmacHeaders('') },
        timeout: 60000,
      };
      const proxyReq = mod.request(options, (proxyRes) => {
        if ((proxyRes.statusCode || 200) >= 400) {
          fileStream.close();
          try { fs.unlinkSync(filepath); } catch (_e) { /* temp file already gone */ }
          return reject(new Error(`POS export returned ${proxyRes.statusCode}`));
        }
        proxyRes.pipe(fileStream);
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
      });
      proxyReq.on('error', (e) => reject(new Error(`POS export connection failed: ${e.message}`)));
      proxyReq.on('timeout', () => { proxyReq.destroy(); reject(new Error('POS export timed out')); });
      proxyReq.end();
    });

    if (toDrive) {
      if (!DRIVE_FOLDER_ID) return res.status(400).json({ message: 'GOOGLE_DRIVE_FOLDER_ID not configured' });
      const link = await uploadToDrive(filepath, DRIVE_FOLDER_ID, 'application/json');
      return res.json({ message: 'Uploaded to Google Drive', filename, driveLink: link });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const stream = fs.createReadStream(filepath);
    stream.pipe(res);
    stream.on('end', () => { try { fs.unlinkSync(filepath); } catch (_e) { /* temp file already gone */ } });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/** DELETE /mainframe/backup/:filename — delete a saved backup */
router.delete('/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  // Sanitize — no path traversal
  if (filename.includes('/') || filename.includes('..')) {
    return res.status(400).json({ message: 'Invalid filename' });
  }
  const filepath = path.join(BACKUP_DIR, filename);
  try {
    fs.unlinkSync(filepath);
    res.json({ message: 'Deleted' });
  } catch {
    res.status(404).json({ message: 'File not found' });
  }
});

export default router;
