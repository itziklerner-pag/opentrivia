const { test, expect } = require('@playwright/test');

// Test configuration  
const BASE_URL = 'http://localhost:3000';
const MANAGER_PASSWORD = 'PASSWORD';

test.describe('Debug PIN Validation', () => {
  test('Trace PIN validation step by step', async ({ browser }) => {
    const context = await browser.newContext();
    const managerPage = await context.newPage();
    const playerPage = await context.newPage();

    // Enable console logging
    managerPage.on('console', msg => console.log(`[MANAGER] ${msg.text()}`));
    playerPage.on('console', msg => console.log(`[PLAYER] ${msg.text()}`));

    console.log('🎮 Starting PIN validation debug...');

    // Step 1: Create room via manager
    console.log('\n📋 STEP 1: Manager creates room');
    await managerPage.goto(`${BASE_URL}/manager`);
    await managerPage.waitForSelector('input[placeholder*="password"], input[type="password"]');
    await managerPage.fill('input[placeholder*="password"], input[type="password"]', MANAGER_PASSWORD);
    await managerPage.click('button:has-text("Create Room"), button:has-text("Submit")');
    await managerPage.waitForSelector('.mb-10.rotate-3.rounded-md.bg-white', { timeout: 15000 });
    
    const pinElement = await managerPage.locator('.mb-10.rotate-3.rounded-md.bg-white').first();
    const gamePin = (await pinElement.textContent()).replace(/[^A-Z0-9]/g, '');
    console.log(`✅ Manager created room with PIN: ${gamePin}`);

    // Step 2: Test API directly with the PIN
    console.log(`\n🔍 STEP 2: Test API directly with PIN: ${gamePin}`);
    const apiResponse = await context.request.post(`${BASE_URL}/api/pusher`, {
      data: { event: 'player:checkRoom', data: gamePin }
    });
    const apiResult = await apiResponse.json();
    console.log(`📡 API Response Status:`, apiResponse.status());
    console.log(`📡 API Response Headers:`, JSON.stringify(apiResponse.headers(), null, 2));
    console.log(`📡 API Response Body:`, JSON.stringify(apiResult, null, 2));

    // Step 3: Player page - manual PIN entry
    console.log(`\n👤 STEP 3: Player enters PIN manually`);
    await playerPage.goto(BASE_URL);
    
    // Wait for page to fully load
    await playerPage.waitForSelector('input[placeholder*="PIN"]', { timeout: 10000 });
    console.log(`🔍 Player page loaded, entering PIN: ${gamePin}`);

    // Fill PIN
    await playerPage.fill('input[placeholder*="PIN"]', gamePin);
    console.log(`✅ PIN entered: ${gamePin}`);

    // Monitor network requests
    playerPage.on('request', request => {
      if (request.url().includes('/api/pusher')) {
        console.log(`🌐 NETWORK REQUEST: ${request.method()} ${request.url()}`);
        console.log(`📤 REQUEST BODY:`, request.postData());
      }
    });

    playerPage.on('response', response => {
      if (response.url().includes('/api/pusher')) {
        console.log(`📥 NETWORK RESPONSE: ${response.status()} ${response.url()}`);
      }
    });

    // Submit PIN
    console.log(`🚀 Submitting PIN...`);
    await playerPage.click('button:has-text("Submit")');

    // Wait and check what happens
    console.log(`⏳ Waiting 5 seconds to see what happens...`);
    await playerPage.waitForTimeout(5000);

    // Check if we're still on the same form or if anything changed
    const currentUrl = playerPage.url();
    const hasUsernameInput = await playerPage.locator('input[placeholder*="Username"]').count() > 0;
    const hasPinInput = await playerPage.locator('input[placeholder*="PIN"]').count() > 0;

    console.log(`📊 RESULTS:`);
    console.log(`   Current URL: ${currentUrl}`);
    console.log(`   Has Username input: ${hasUsernameInput}`);
    console.log(`   Still has PIN input: ${hasPinInput}`);

    if (hasUsernameInput) {
      console.log(`✅ SUCCESS: Username form appeared!`);
    } else if (hasPinInput) {
      console.log(`❌ FAILURE: Still stuck on PIN form`);
    } else {
      console.log(`❓ UNKNOWN: Unexpected state`);
    }

    await context.close();
  });
});