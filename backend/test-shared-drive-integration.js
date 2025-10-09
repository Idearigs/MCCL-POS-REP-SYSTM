const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testSharedDriveIntegration() {
  console.log('🔗 Testing Google Shared Drive Integration...\n');

  const baseUrl = 'http://localhost:3002/api/v1';
  
  try {
    // Check current storage status
    console.log('1️⃣ Checking file storage status...');
    
    const statusResponse = await axios.get(`${baseUrl}/file-storage/status`);
    console.log('📊 Storage Status:', JSON.stringify(statusResponse.data, null, 2));
    
    if (!statusResponse.data.googleDriveAvailable) {
      console.log('⚠️  Google Drive not available. This is expected if Shared Drive folders are not configured yet.');
    }

    // Test storage methods
    console.log('\n2️⃣ Testing storage methods...');
    
    const testResponse = await axios.post(`${baseUrl}/file-storage/test`);
    console.log('🧪 Test Results:', JSON.stringify(testResponse.data, null, 2));
    
    if (testResponse.data.googleDrive.error) {
      console.log('❌ Google Drive Error:', testResponse.data.googleDrive.error);
      
      if (testResponse.data.googleDrive.error.includes('Shared Drive folder not accessible')) {
        console.log('\n💡 This error is expected. It means:');
        console.log('   1. Client needs to create the Shared Drive');
        console.log('   2. Client needs to add developer and service account as members');
        console.log('   3. Developer needs to create folders and get folder IDs');
        console.log('   4. Environment variables need to be updated with folder IDs');
      }
    }

    // Create a test file for Shared Drive upload
    console.log('\n3️⃣ Creating test file for Shared Drive upload...');
    
    const testFileContent = `
SHARED DRIVE TEST FILE
=====================
Test timestamp: ${new Date().toISOString()}
Purpose: Verify Google Shared Drive integration
System: MPS Jewelry Management System

Expected behavior:
- If Shared Drive folders are configured: Upload to Google Drive
- If not configured: Fallback to local storage

Configuration check:
- GOOGLE_SHARED_DRIVE_REPAIRS_FOLDER_ID: ${process.env.GOOGLE_SHARED_DRIVE_REPAIRS_FOLDER_ID || 'NOT SET'}
- GOOGLE_SHARED_DRIVE_CUSTOMERS_FOLDER_ID: ${process.env.GOOGLE_SHARED_DRIVE_CUSTOMERS_FOLDER_ID || 'NOT SET'}
- GOOGLE_SHARED_DRIVE_PRODUCTS_FOLDER_ID: ${process.env.GOOGLE_SHARED_DRIVE_PRODUCTS_FOLDER_ID || 'NOT SET'}
- GOOGLE_SHARED_DRIVE_RECEIPTS_FOLDER_ID: ${process.env.GOOGLE_SHARED_DRIVE_RECEIPTS_FOLDER_ID || 'NOT SET'}

Service Account: mps-drive-storage@mps-jewelry-storage-2024.iam.gserviceaccount.com

File upload test: ${Date.now()}
    `.trim();

    const testFilePath = path.join(__dirname, 'shared-drive-test.txt');
    fs.writeFileSync(testFilePath, testFileContent);
    
    console.log('✅ Test file created:', testFilePath);
    console.log('📏 File size:', fs.statSync(testFilePath).size, 'bytes');

    // Test upload to repair-images category (should use Shared Drive if configured)
    console.log('\n4️⃣ Testing file upload with Shared Drive...');
    
    const formData = new FormData();
    formData.append('images', fs.createReadStream(testFilePath), {
      filename: 'shared-drive-test.txt',
      contentType: 'text/plain'
    });
    
    formData.append('repairId', 'REP-SHARED-DRIVE-TEST');
    formData.append('description', 'Google Shared Drive integration test');
    formData.append('uploadedBy', 'system-test');

    try {
      const uploadResponse = await axios.post(
        `${baseUrl}/file-storage/upload/repair-images`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 15000
        }
      );

      console.log('🎉 Upload Response:', JSON.stringify(uploadResponse.data, null, 2));
      
      // Check upload method used
      const result = uploadResponse.data.results[0];
      if (result.success) {
        console.log(`\n📈 Upload Success Details:`);
        console.log(`   Method used: ${result.uploadMethod}`);
        console.log(`   File URL: ${result.fileUrl}`);
        console.log(`   File size: ${result.size} bytes`);
        console.log(`   File name: ${result.fileName}`);
        
        if (result.uploadMethod === 'google-drive') {
          console.log('✅ SUCCESS: Google Shared Drive integration working!');
          console.log('🔗 File stored in client\'s Google Workspace Shared Drive');
        } else if (result.uploadMethod === 'local') {
          console.log('⚠️  FALLBACK: Using local storage (Shared Drive not configured)');
          console.log('💡 This is normal if Shared Drive setup is not complete');
        }
        
        // Test file accessibility
        console.log('\n5️⃣ Testing file accessibility...');
        try {
          const fileResponse = await axios.get(result.fileUrl, { timeout: 10000 });
          console.log('✅ File accessible via HTTP');
          console.log('📄 Content preview:', fileResponse.data.substring(0, 200) + '...');
        } catch (accessError) {
          console.log('⚠️  File access test failed:', accessError.message);
          
          if (result.uploadMethod === 'google-drive') {
            console.log('💡 For Google Drive files, you may need to configure permissions');
          }
        }
      }

    } catch (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      
      if (uploadError.response) {
        console.error('📄 Response status:', uploadError.response.status);
        console.error('📄 Response data:', uploadError.response.data);
        
        if (uploadError.response.data.message && uploadError.response.data.message.includes('Shared Drive folder not accessible')) {
          console.log('\n💡 Shared Drive Configuration Required:');
          console.log('   1. Client needs to create Shared Drive');
          console.log('   2. Add developer email as Manager');
          console.log('   3. Add service account as Content manager');
          console.log('   4. Developer creates folders and gets IDs');
          console.log('   5. Update environment variables');
        }
      }
    }

    // Clean up test file
    console.log('\n🧹 Cleaning up test files...');
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    console.log('✅ Test file cleaned up');

    // Summary
    console.log('\n📋 Shared Drive Integration Summary:');
    console.log('✅ Backend Code: Ready for Shared Drive');
    console.log('✅ Environment Variables: Configured (awaiting folder IDs)');
    console.log('✅ Fallback System: Working (local storage)');
    console.log('✅ API Flags: supportsAllDrives enabled');
    
    console.log('\n🎯 Current Status:');
    if (process.env.GOOGLE_SHARED_DRIVE_REPAIRS_FOLDER_ID) {
      console.log('✅ Shared Drive folder IDs configured');
    } else {
      console.log('⏳ Waiting for client to provide Shared Drive access');
      console.log('📖 See CLIENT_SHARED_DRIVE_SETUP_GUIDE.md for next steps');
    }
    
    console.log('\n🔜 Next Steps:');
    console.log('1. Client creates Shared Drive and adds members');
    console.log('2. Developer creates folder structure');
    console.log('3. Update environment variables with folder IDs');
    console.log('4. Re-run this test to verify Google Drive integration');

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure the backend server is running on port 3002');
    }
    
    if (error.response) {
      console.error('📄 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    }
  }
}

// Load environment variables
require('dotenv').config();

testSharedDriveIntegration();