const { google } = require('googleapis');
require('dotenv').config();

async function testGoogleDrive() {
  console.log('🔍 Testing Google Drive Connection...\n');
  
  try {
    // Get environment variables
    const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
    const projectId = process.env.GOOGLE_DRIVE_PROJECT_ID;
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
    
    console.log('📋 Configuration:');
    console.log(`   Client Email: ${clientEmail}`);
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Parent Folder ID: ${parentFolderId}\n`);
    
    // Create JWT client
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    // Test authentication
    console.log('🔐 Testing authentication...');
    const aboutResponse = await drive.about.get({ fields: 'user' });
    console.log(`✅ Authenticated as: ${aboutResponse.data.user.displayName || aboutResponse.data.user.emailAddress}\n`);
    
    // Test main folder access first
    console.log('📁 Testing main folder access...');
    const mainFolderId = '1Xy0PIIRg-YBbmDHpQodx2xp_uRamm3NQ';
    try {
      const mainFolderResponse = await drive.files.get({
        fileId: mainFolderId,
        fields: 'id,name,permissions'
      });
      console.log(`✅ Main folder accessible: ${mainFolderResponse.data.name}`);
    } catch (mainError) {
      console.log(`❌ Main folder error: ${mainError.message}`);
    }
    
    // Test subfolder access
    console.log('📁 Testing repair-image subfolder access...');
    try {
      const folderResponse = await drive.files.get({
        fileId: parentFolderId,
        fields: 'id,name,permissions'
      });
      console.log(`✅ Repair subfolder accessible: ${folderResponse.data.name}`);
    } catch (subError) {
      console.log(`❌ Repair subfolder error: ${subError.message}`);
      console.log('   Trying to find repair-image folder in main folder...');
      
      // List files in main folder to find repair-image subfolder
      const listResponse = await drive.files.list({
        q: `'${mainFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id,name)'
      });
      
      console.log('   Subfolders found:');
      listResponse.data.files?.forEach(file => {
        console.log(`      ${file.name} (${file.id})`);
      });
    }
    
    // List all accessible files/folders
    console.log('📂 Listing all accessible files/folders...');
    try {
      const allFiles = await drive.files.list({
        pageSize: 20,
        fields: 'files(id,name,mimeType,parents)',
        orderBy: 'createdTime desc'
      });
      
      console.log('   Accessible files/folders:');
      if (allFiles.data.files && allFiles.data.files.length > 0) {
        allFiles.data.files.forEach((file, index) => {
          const type = file.mimeType === 'application/vnd.google-apps.folder' ? '📁' : '📄';
          console.log(`      ${index + 1}. ${type} ${file.name} (${file.id})`);
        });
      } else {
        console.log('      No files/folders accessible to service account');
      }
    } catch (listError) {
      console.log(`   ❌ Cannot list files: ${listError.message}`);
    }

    // Test file upload
    console.log('\n📤 Testing file upload...');
    const testFileName = `test-upload-${Date.now()}.txt`;
    const testContent = 'Test file content - ' + new Date().toISOString();
    
    const fileMetadata = {
      name: testFileName,
      parents: [parentFolderId]
    };
    
    const media = {
      mimeType: 'text/plain',
      body: testContent
    };
    
    const uploadResponse = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id,name,webViewLink'
    });
    
    console.log(`✅ File uploaded successfully!`);
    console.log(`   File Name: ${uploadResponse.data.name}`);
    console.log(`   File ID: ${uploadResponse.data.id}`);
    console.log(`   View Link: ${uploadResponse.data.webViewLink}\n`);
    
    // Clean up - delete test file
    await drive.files.delete({ fileId: uploadResponse.data.id });
    console.log('🗑️  Test file deleted\n');
    
    console.log('🎉 Google Drive connection test PASSED!');
    console.log('✅ Ready to upload repair images\n');
    
  } catch (error) {
    console.error('❌ Google Drive test FAILED:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    
    if (error.message.includes('storage quota') || error.message.includes('Service Accounts')) {
      console.error('   💡 This is likely a service account storage quota issue');
    }
    
    if (error.code === 404) {
      console.error('   💡 Folder not found or no access - check folder ID and permissions');
    }
    
    if (error.code === 403) {
      console.error('   💡 Permission denied - service account needs access to the folder');
    }
  }
}

testGoogleDrive();