const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testNewFileStorage() {
  console.log('🧪 Testing New File Storage System...\n');

  const baseUrl = 'http://localhost:3002/api/v1';
  
  try {
    // Test 1: Check storage status
    console.log('1️⃣ Testing storage status...');
    const statusResponse = await axios.get(`${baseUrl}/file-storage/status`);
    console.log('✅ Storage Status:', JSON.stringify(statusResponse.data, null, 2));
    
    // Test 2: Run storage method tests
    console.log('\n2️⃣ Testing storage methods...');
    const testResponse = await axios.post(`${baseUrl}/file-storage/test`);
    console.log('✅ Storage Tests:', JSON.stringify(testResponse.data, null, 2));
    
    // Test 3: Create a test image file
    console.log('\n3️⃣ Creating test image for upload...');
    const testImageContent = Buffer.from('Test image content for repair job upload test - ' + new Date().toISOString());
    const testImagePath = path.join(__dirname, 'test-repair-image.txt');
    fs.writeFileSync(testImagePath, testImageContent);
    console.log('✅ Test file created:', testImagePath);
    
    // Test 4: Upload repair image
    console.log('\n4️⃣ Testing repair image upload...');
    const formData = new FormData();
    formData.append('images', fs.createReadStream(testImagePath), {
      filename: 'test-repair-image.txt',
      contentType: 'text/plain'
    });
    formData.append('repairId', 'REP-TEST-001');
    formData.append('description', 'Test upload for new storage system');
    formData.append('uploadedBy', 'test-script');
    
    const uploadResponse = await axios.post(
      `${baseUrl}/file-storage/upload/repair-images`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Content-Type': 'multipart/form-data'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    console.log('✅ Upload Response:', JSON.stringify(uploadResponse.data, null, 2));
    
    // Clean up test file
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('✅ Test file cleaned up');
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
    // Summary
    const results = uploadResponse.data;
    if (results.summary) {
      console.log('\n📊 Upload Summary:');
      console.log(`   Total files: ${results.summary.totalFiles}`);
      console.log(`   Successful: ${results.summary.successful}`);
      console.log(`   Failed: ${results.summary.failed}`);
      console.log(`   Upload methods used:`, results.summary.uploadMethods);
    }
    
    if (results.results && results.results.length > 0) {
      const firstResult = results.results[0];
      console.log('\n🔗 First file result:');
      console.log(`   Success: ${firstResult.success}`);
      console.log(`   File URL: ${firstResult.fileUrl}`);
      console.log(`   Upload method: ${firstResult.uploadMethod}`);
      console.log(`   File size: ${firstResult.size} bytes`);
      
      if (firstResult.error) {
        console.log(`   Error: ${firstResult.error}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', error.response.data);
    }
  }
}

testNewFileStorage();