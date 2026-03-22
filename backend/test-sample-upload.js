const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function uploadSampleFile() {
  console.log('📤 Uploading Sample Repair Image...\n');

  const baseUrl = 'http://localhost:3002/api/v1';
  
  try {
    // Create a sample "image" file (we'll use a text file as a mock image)
    const sampleImageContent = `
SAMPLE REPAIR IMAGE FILE
========================
Repair ID: REP-202509-0008
Customer: John Smith  
Item: Gold Necklace Chain Repair
Date: ${new Date().toISOString()}
Description: Chain link broken, needs soldering
Estimated Cost: £45.00
Status: Before Repair

This would normally be an actual image file (JPG/PNG)
showing the damaged jewelry item before repair work begins.

--- Technical Details ---
Upload Method: New File Storage System
Fallback Strategy: Google Drive -> Local Storage
File Storage Location: /uploads/repair-images/
Access URL: http://localhost:3002/uploads/repair-images/

--- Test Metadata ---
Original filename: sample-repair-before.jpg
Mime type: image/jpeg (simulated)
Upload timestamp: ${Date.now()}
    `.trim();

    const sampleFilePath = path.join(__dirname, 'sample-repair-before.jpg');
    fs.writeFileSync(sampleFilePath, sampleImageContent);
    console.log('✅ Sample file created:', sampleFilePath);
    console.log('📏 File size:', fs.statSync(sampleFilePath).size, 'bytes');

    // Upload the sample file
    console.log('\n📤 Uploading to repair-images endpoint...');
    const formData = new FormData();
    
    formData.append('images', fs.createReadStream(sampleFilePath), {
      filename: 'sample-repair-before.jpg',
      contentType: 'image/jpeg'
    });
    
    // Add metadata
    formData.append('repairId', 'REP-202509-0008');
    formData.append('description', 'Gold necklace chain repair - before photo');
    formData.append('uploadedBy', 'repair-technician');

    const uploadResponse = await axios.post(
      `${baseUrl}/file-storage/upload/repair-images`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 10000
      }
    );

    console.log('🎉 Upload successful!');
    console.log('📊 Response:', JSON.stringify(uploadResponse.data, null, 2));

    // Test file accessibility
    const result = uploadResponse.data.results[0];
    if (result && result.success && result.fileUrl) {
      console.log('\n🔗 Testing file accessibility...');
      
      try {
        const fileResponse = await axios.get(result.fileUrl, { timeout: 5000 });
        console.log('✅ File accessible via HTTP');
        console.log('📄 Content preview:', fileResponse.data.substring(0, 100) + '...');
      } catch (accessError) {
        console.log('⚠️  File access test failed:', accessError.message);
      }
    }

    // Clean up
    if (fs.existsSync(sampleFilePath)) {
      fs.unlinkSync(sampleFilePath);
      console.log('\n🧹 Temporary file cleaned up');
    }

    // Summary
    console.log('\n📋 Upload Summary:');
    if (uploadResponse.data.summary) {
      console.log(`   Total files: ${uploadResponse.data.summary.totalFiles}`);
      console.log(`   Successful uploads: ${uploadResponse.data.summary.successful}`);
      console.log(`   Failed uploads: ${uploadResponse.data.summary.failed}`);
      console.log(`   Upload methods used:`, uploadResponse.data.summary.uploadMethods);
    }

    if (uploadResponse.data.results?.[0]) {
      const file = uploadResponse.data.results[0];
      console.log('\n📁 File Details:');
      console.log(`   Success: ${file.success}`);
      console.log(`   Upload method: ${file.uploadMethod}`);
      console.log(`   File URL: ${file.fileUrl}`);
      console.log(`   File name: ${file.fileName}`);
      console.log(`   File size: ${file.size} bytes`);
    }

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    
    if (error.response) {
      console.error('📄 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure the backend server is running on port 3002');
    }
  }
}

uploadSampleFile();