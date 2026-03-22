import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { requireAuth, signToken } from '../middleware/auth';

const router = Router();

function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password + (process.env.PASSWORD_SALT || 'truedesk-mainframe-salt'))
    .digest('hex');
}

// POST /mainframe/admins/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await prisma.mf_admins.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (hashPassword(password) !== admin.passwordHash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await prisma.mf_admins.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });

    return res.json({
      token,
      admin: {
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /mainframe/admins
router.get('/', requireAuth, async (_req, res) => {
  try {
    const admins = await prisma.mf_admins.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(admins);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /mainframe/admins/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const admin = await prisma.mf_admins.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    return res.json(admin);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/admins
router.post('/', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    const existing = await prisma.mf_admins.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return res.status(409).json({ message: 'Admin with this email already exists' });
    }

    const admin = await prisma.mf_admins.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
        role: role || 'admin',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(201).json(admin);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /mainframe/admins/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, role, isActive } = req.body;
    const admin = await prisma.mf_admins.update({
      where: { id: req.params.id },
      data: { firstName, lastName, role, isActive },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
    return res.json(admin);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/admins/:id/change-password
router.post('/:id/change-password', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    await prisma.mf_admins.update({
      where: { id: req.params.id },
      data: { passwordHash: hashPassword(password) },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
