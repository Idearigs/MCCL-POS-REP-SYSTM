# 🔧 Client Shared Drive Setup Guide

## Overview

Your MPS Jewelry System needs to integrate with Google Drive for secure file storage. Due to Google's service account limitations, we'll use your Google Workspace Shared Drive instead of personal storage.

## Why Shared Drive?

- **Service Account Quota Issue**: Google service accounts cannot store files in personal drives (no storage quota)
- **Business Solution**: Shared Drives are designed for business applications and service account access
- **Better Security**: Files remain in your control within your Google Workspace
- **Scalable**: No storage limitations for business accounts

## Required Setup Steps

### Step 1: Create Shared Drive (Client Action Required)

1. **Log into Google Drive** with your Google Workspace account
2. **Click "Shared drives"** in the left sidebar
3. **Click "+ New"** to create a new Shared Drive
4. **Name it**: `MPS Jewelry System Files`
5. **Click "Create"`

### Step 2: Add Members (Client Action Required)

You need to add two members to the Shared Drive:

#### A. Add Developer (for setup and testing)
1. **Click on your new Shared Drive**
2. **Click the "Members" tab**
3. **Click "Add members"**
4. **Add email**: `[DEVELOPER_GMAIL_HERE]` (your developer's personal Gmail)
5. **Set role**: `Manager`
6. **Click "Send"`

#### B. Add Service Account (for backend system)
1. **Click "Add members" again**
2. **Add email**: `mps-drive-storage@mps-jewelry-storage-2024.iam.gserviceaccount.com`
3. **Set role**: `Content manager`
4. **Click "Send"`

> ⚠️ **Important**: The service account email won't receive the invitation, but it will gain access automatically.

### Step 3: Verify Access

After adding members, your Shared Drive should show:
- Your account (Owner)
- Developer Gmail (Manager)
- Service account (Content manager)

## Next Steps (After Client Completes Setup)

### Step 1: Developer Creates Folders
Once the developer has access, they will:

1. **Log into the Shared Drive** with their Gmail account
2. **Create folder structure**:
   ```
   MPS Jewelry System Files/
   ├── Repairs/           (for repair job photos)
   ├── Customers/         (for customer documents)
   ├── Products/          (for product images)
   └── Receipts/          (for transaction receipts)
   ```

### Step 2: Get Folder IDs
The developer will:
1. **Right-click each folder** → "Get link"
2. **Extract folder IDs** from the URLs (the part after `/folders/`)
3. **Update the system configuration** with these IDs

### Step 3: System Configuration
The following environment variables will be updated:
```env
GOOGLE_SHARED_DRIVE_REPAIRS_FOLDER_ID="[REPAIRS_FOLDER_ID]"
GOOGLE_SHARED_DRIVE_CUSTOMERS_FOLDER_ID="[CUSTOMERS_FOLDER_ID]"
GOOGLE_SHARED_DRIVE_PRODUCTS_FOLDER_ID="[PRODUCTS_FOLDER_ID]"
GOOGLE_SHARED_DRIVE_RECEIPTS_FOLDER_ID="[RECEIPTS_FOLDER_ID]"
```

## Current System Status

✅ **Backend Code**: Updated to support Shared Drives with proper API flags
✅ **Environment Variables**: Configured for Shared Drive folder IDs
✅ **Fallback System**: Local storage continues working while Shared Drive is configured
✅ **Security**: All files will be stored in your controlled Workspace environment

## What Happens Next?

1. **Client completes Steps 1-3** above
2. **Developer receives access** and creates folder structure
3. **System is updated** with folder IDs
4. **Google Drive integration becomes primary** storage method
5. **All repair photos, customer documents, etc.** are stored in your Shared Drive

## Security & Control

- **Full Control**: You own the Shared Drive and can revoke access anytime
- **No VPS Storage**: Files are not permanently stored on our servers
- **Workspace Security**: Benefits from your Google Workspace security policies
- **Access Logs**: Google provides full audit logs of file access

## Support

If you encounter any issues during setup:
1. Ensure you're using a Google Workspace account (not personal Gmail)
2. Verify you have Shared Drive creation permissions
3. Check that both email addresses were added correctly
4. Contact your developer if you need assistance with any step

---

**Ready to proceed?** Please complete Steps 1-3 above and notify your developer when the Shared Drive access has been granted.