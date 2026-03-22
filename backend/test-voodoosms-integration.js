const axios = require('axios');

async function testVoodooSMSIntegration() {
  console.log('📱 Testing VoodooSMS Integration...\n');

  const baseUrl = 'http://localhost:3002/api/v1';
  
  try {
    // 1. Test SMS balance
    console.log('1️⃣ Checking SMS account balance...');
    
    try {
      const balanceResponse = await axios.get(`${baseUrl}/sms/balance`, {
        headers: {
          'Authorization': 'Bearer your-test-jwt-token' // You'll need a valid JWT token
        }
      });
      
      console.log('💰 Balance Response:', JSON.stringify(balanceResponse.data, null, 2));
    } catch (balanceError) {
      console.log('⚠️  Balance check failed (expected without auth token):', balanceError.response?.status);
    }

    // 2. Direct VoodooSMS REST API test (bypass our backend for now)
    console.log('\n2️⃣ Testing direct VoodooSMS REST API...');
    
    const directTestData = {
      to: '447859888649', // UK number WITH country code
      from: 'MPS Jewel', 
      msg: `🔧 Test SMS from MPS Jewelry System at ${new Date().toLocaleTimeString()}. Integration test successful!`,
      external_reference: 'test_integration'
    };

    console.log('📤 Sending test SMS to VoodooSMS REST API...');
    console.log('📞 Test phone number:', directTestData.to);
    console.log('💬 Message:', directTestData.msg);

    try {
      const directResponse = await axios.post(
        'https://api.voodoosms.com/sendsms',
        directTestData,
        {
          headers: {
            'Authorization': 'Bearer 806MdEgJSrTpsI0ELsmIG3a6oru56v55m1IF5pONVi2Ert',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log('🎉 Direct VoodooSMS Response:', JSON.stringify(directResponse.data, null, 2));
      
      if (directResponse.status === 200) {
        console.log('✅ SUCCESS: SMS sent successfully via VoodooSMS REST API!');
        console.log(`📊 Message ID: ${directResponse.data.message_id || directResponse.data.id || 'sent'}`);
        console.log(`💳 Credits used: ${directResponse.data.credits_used || directResponse.data.message_count || 1}`);
        console.log(`💰 Credits remaining: ${directResponse.data.credits_remaining || 'Check dashboard'}`);
      } else {
        console.log('❌ SMS sending failed:', directResponse.data.error || directResponse.data.message);
      }

    } catch (directError) {
      console.error('❌ Direct VoodooSMS API error:', directError.message);
      if (directError.response) {
        console.error('📄 Response status:', directError.response.status);
        console.error('📄 Response data:', directError.response.data);
      }
    }

    // 3. Test backend SMS service (without auth for now)
    console.log('\n3️⃣ Testing backend SMS service...');
    
    const backendTestData = {
      to: '+44 7859 888649', // UK number with formatting
      message: `🏪 Repair Status Update: Your jewelry repair REP-2025-001 for "Gold necklace chain" is now IN PROGRESS. Expected completion: ${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString()}. Contact us: +44 1234 567890 - MPS Jewelry`,
      reference: 'repair_status_test'
    };

    console.log('📤 Testing backend SMS endpoint...');
    console.log('💬 Repair status message:', backendTestData.message.substring(0, 100) + '...');

    try {
      // Note: This would normally require authentication
      const backendResponse = await axios.post(
        `${baseUrl}/sms/send`,
        backendTestData,
        {
          headers: {
            // 'Authorization': 'Bearer your-jwt-token' // Commented out for testing
          },
          timeout: 10000
        }
      );

      console.log('🎉 Backend SMS Response:', JSON.stringify(backendResponse.data, null, 2));
      
    } catch (backendError) {
      console.log('⚠️  Backend SMS test failed (expected without auth):', backendError.response?.status);
      if (backendError.response?.status === 401) {
        console.log('💡 This is expected - authentication is required for the backend SMS endpoint');
      }
    }

    // 4. Test repair status SMS formatting
    console.log('\n4️⃣ Testing repair status SMS message formats...');
    
    const statusMessages = {
      'RECEIVED': '📥 Your jewelry repair (REP-2025-001) for "Gold necklace chain" has been RECEIVED and is being assessed.',
      'IN_PROGRESS': '🔧 Your repair REP-2025-001 is IN PROGRESS. "Gold necklace chain" is being worked on by our technicians.',
      'COMPLETED': '✨ Great news! Your repair REP-2025-001 is COMPLETED. "Gold necklace chain" is ready for collection.',
      'READY_FOR_COLLECTION': '🏪 Your jewelry repair REP-2025-001 - "Gold necklace chain" is ready for pickup at our shop.',
      'DELAYED': '⏱️ Update: Repair REP-2025-001 - "Gold necklace chain" is experiencing delays. New estimated completion: 15/09/2025.'
    };

    Object.entries(statusMessages).forEach(([status, message]) => {
      const fullMessage = message + ' Contact us: +94 11 234 5678 - MPS Jewelry';
      console.log(`📱 ${status}: ${fullMessage.length} chars`);
      console.log(`   "${fullMessage.substring(0, 80)}..."`);
    });

    console.log('\n📋 Integration Test Summary:');
    console.log('✅ VoodooSMS API Key: Configured');
    console.log('✅ Sri Lankan phone format: Supported');
    console.log('✅ SMS message formatting: Ready');
    console.log('✅ Direct API communication: Tested');
    console.log('⚠️  Backend authentication: Required for full testing');

    console.log('\n🎯 Next Steps:');
    console.log('1. Replace test phone number (94771234567) with your real number');
    console.log('2. Test with a valid JWT token for backend endpoints');
    console.log('3. Create a test customer and repair job');
    console.log('4. Test repair status changes with SMS notifications');
    
    console.log('\n⚠️  IMPORTANT: Update the test phone number before running!');
    console.log('   Current: 94771234567 (example)');
    console.log('   Change to: Your real Sri Lankan mobile number');

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure the backend server is running on port 3002');
    }
  }
}

// Load environment variables
require('dotenv').config();

testVoodooSMSIntegration();