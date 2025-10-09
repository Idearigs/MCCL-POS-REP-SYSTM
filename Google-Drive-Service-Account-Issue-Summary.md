# Google Drive Service Account Issue Summary

## Background Context

We are developing an MPS (Jewelry Management System) using NestJS backend with TypeScript. The system needs to handle file uploads for repair job images, customer documents, and product images. We previously had a working Google Drive integration, but it was causing issues with repair job functionality.

## Original Problem

The original repair jobs system was failing because of Google Drive integration issues. Users couldn't upload images for repair jobs, which is a critical feature for documenting jewelry repair work (before/after photos, progress documentation).

## Our Solution Approach

We completely rebuilt the file storage system from scratch with a multi-strategy approach:

1. **Primary Strategy**: Google Drive API v3 with service account authentication
2. **Fallback Strategy**: Local file storage with HTTP serving
3. **Graceful Degradation**: System continues working even if Google Drive fails

## Current Implementation

### Google Drive Configuration
```typescript
// Service Account Authentication
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
  key: process.env.GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata'
  ]
});

const driveClient = google.drive({ version: 'v3', auth });
```

### File Upload Strategy
```typescript
async uploadFile(options: FileUploadOptions): Promise<FileUploadResult> {
  // Strategy 1: Try Google Drive first
  if (this.isGoogleDriveAvailable) {
    try {
      const driveResult = await this.uploadToGoogleDrive(options);
      if (driveResult.success) return driveResult;
    } catch (error) {
      this.logger.warn(`Google Drive upload failed: ${error.message}`);
    }
  }

  // Strategy 2: Fallback to local storage
  const localResult = await this.uploadToLocal(options);
  return localResult;
}
```

## Current Error

The system is now working with local storage fallback, but Google Drive uploads are failing with this specific error:

```
⚠️ Google Drive upload failed: Google Drive upload failed: Service Accounts do not have storage quota. Leverage shared drives (https://developers.google.com/workspace/drive/api/guides/about-shareddrives), or use OAuth delegation (http://support.google.com/a/answer/7281227) instead.
```

## Server Logs Showing the Issue
```
[FileStorageService] 📤 Starting file upload: test-before-repair.jpg (692 bytes)
[FileStorageService] ⚠️ Google Drive upload failed: Google Drive upload failed: Service Accounts do not have storage quota. Leverage shared drives (https://developers.google.com/workspace/drive/api/guides/about-shareddrives), or use OAuth delegation (http://support.google.com/a/answer/7281227) instead.
[FileStorageService] ✅ Local storage upload successful: test-before-repair.jpg
```

## What We've Tried

1. **Service Account Setup**: Created Google Cloud project with service account
2. **Proper Scopes**: Using comprehensive Drive API scopes
3. **Authentication**: JWT authentication working (no auth errors)
4. **API Access**: Can access Drive API (about.get() works)
5. **File Upload Logic**: Proper file upload implementation with streams

## Current File Upload Implementation
```typescript
async uploadToGoogleDrive(options: FileUploadOptions): Promise<FileUploadResult> {
  const { fileName, buffer, mimeType, category, metadata } = options;
  
  const timestamp = Date.now();
  const uniqueFileName = `${timestamp}-${fileName}`;
  
  const fileMetadata = {
    name: uniqueFileName,
    description: `MPS Jewelry System - ${category} - ${metadata?.description || 'File upload'}`,
  };

  // Try to use target folder if configured
  const parentFolderId = this.configService.get('GOOGLE_DRIVE_PARENT_FOLDER_ID');
  if (parentFolderId) {
    try {
      await this.driveClient.files.get({ fileId: parentFolderId });
      fileMetadata.parents = [parentFolderId];
    } catch (folderError) {
      this.logger.debug(`Cannot access target folder, uploading to root`);
    }
  }

  const media = {
    mimeType,
    body: Readable.from(buffer)
  };

  // This is where the quota error occurs
  const response = await this.driveClient.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id,name,webViewLink,webContentLink,size'
  });
}
```

## Environment Variables
```env
GOOGLE_DRIVE_CLIENT_EMAIL=mps-jewelry-service@mps-jewelry-system-443614.iam.gserviceaccount.com
GOOGLE_DRIVE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n[PRIVATE_KEY_CONTENT]\n-----END PRIVATE KEY-----
GOOGLE_DRIVE_PROJECT_ID=mps-jewelry-system-443614
GOOGLE_DRIVE_PARENT_FOLDER_ID=[FOLDER_ID]
```

## Questions for ChatGPT

1. **Service Account Quota Issue**: The error message suggests service accounts don't have storage quota. Is this a recent Google policy change? How can we resolve this?

2. **Shared Drives Solution**: The error mentions using shared drives. How do we:
   - Create and configure a shared drive for our service account?
   - Modify our code to upload to shared drives instead of personal drives?
   - What permissions are needed?

3. **OAuth Delegation Alternative**: The error mentions OAuth delegation. Would this be better than shared drives for our use case? How would we implement it?

4. **Google Workspace Requirements**: Do we need a Google Workspace account for this to work? We're currently using a free Google account.

5. **Alternative Approaches**: Are there other ways to use Google Drive API for file storage in a production application without running into quota issues?

6. **Best Practices**: For a jewelry management system that needs to store repair photos and customer documents, what's the recommended Google Drive integration approach in 2025?

## Current Workaround

Our system is currently working with local storage fallback, but we'd prefer to have Google Drive as the primary storage for:
- Better reliability
- Automatic backups
- Easier file management
- Cloud accessibility

## Technical Environment

- **Backend**: NestJS with TypeScript
- **Google APIs**: googleapis npm package (latest version)
- **Authentication**: Service Account with JSON key file
- **File Types**: Primarily images (JPG, PNG) for jewelry repair documentation
- **Volume**: Low to medium (small jewelry shop, maybe 50-100 images per month)
- **Security**: Need secure storage for customer jewelry photos

The system is working fine with local storage, but we want to get Google Drive integration working properly for production deployment.