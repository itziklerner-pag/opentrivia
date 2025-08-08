const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3000';

test.describe('Debug Pusher API', () => {
  test('Test Pusher API endpoint directly', async ({ page }) => {
    console.log('🔍 Testing Pusher API endpoint...');

    // Test the API endpoint directly
    const response = await page.request.post(`${BASE_URL}/api/pusher`, {
      data: {
        event: 'player:checkRoom',
        data: 'INVALID_PIN_TEST'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 API Response status:', response.status());
    
    if (response.ok()) {
      const responseBody = await response.json();
      console.log('✅ API Response body:', JSON.stringify(responseBody, null, 2));
    } else {
      const errorBody = await response.text();
      console.log('❌ API Error body:', errorBody);
    }

    // Also test with a manager creation
    console.log('\n📋 Testing manager room creation...');
    const managerResponse = await page.request.post(`${BASE_URL}/api/pusher`, {
      data: {
        event: 'manager:createRoom',
        data: 'PASSWORD'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Manager API Response status:', managerResponse.status());
    
    if (managerResponse.ok()) {
      const managerBody = await managerResponse.json();
      console.log('✅ Manager API Response body:', JSON.stringify(managerBody, null, 2));
      
      // Now test checkRoom with the actual room ID
      if (managerBody.roomId) {
        console.log('\n🔍 Testing checkRoom with real room ID:', managerBody.roomId);
        const checkResponse = await page.request.post(`${BASE_URL}/api/pusher`, {
          data: {
            event: 'player:checkRoom',
            data: managerBody.roomId
          },
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📡 CheckRoom API Response status:', checkResponse.status());
        if (checkResponse.ok()) {
          const checkBody = await checkResponse.json();
          console.log('✅ CheckRoom API Response body:', JSON.stringify(checkBody, null, 2));
        } else {
          const checkError = await checkResponse.text();
          console.log('❌ CheckRoom API Error body:', checkError);
        }
      }
    } else {
      const managerError = await managerResponse.text();
      console.log('❌ Manager API Error body:', managerError);
    }
  });
});