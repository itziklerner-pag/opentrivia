const axios = require('axios');

async function testAPI() {
  try {
    console.log('🔧 Testing API endpoints...');
    
    // Test room creation
    console.log('1. Testing room creation...');
    const createResponse = await axios.post('http://localhost:3001/api/pusher', {
      event: 'manager:createRoom',
      data: 'admin123'
    });
    
    console.log('✅ Room creation response:', createResponse.data);
    const roomId = createResponse.data.roomId;
    
    if (!roomId) {
      console.log('❌ No room ID returned');
      return;
    }
    
    // Test game start
    console.log('2. Testing game start...');
    const startResponse = await axios.post('http://localhost:3001/api/pusher', {
      event: 'manager:startGame',
      data: { roomId }
    });
    
    console.log('✅ Game start response:', startResponse.data);
    
    // Test question progression
    console.log('3. Testing question progression...');
    const nextResponse = await axios.post('http://localhost:3001/api/pusher', {
      event: 'manager:nextQuestion',
      data: { roomId }
    });
    
    console.log('✅ Next question response:', nextResponse.data);
    
    console.log('🎯 All API tests passed!');
    
  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
  }
}

testAPI();