const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const MANAGER_PASSWORD = 'PASSWORD';

test.describe('Debug Manual Join Flow', () => {
  let gamePin;

  test('Complete manual join flow with detailed debugging', async ({ browser }) => {
    const context = await browser.newContext();
    const managerPage = await context.newPage();
    const playerPage = await context.newPage();

    // Enable detailed console logging
    managerPage.on('console', msg => {
      console.log(`[MANAGER] ${msg.text()}`);
    });
    playerPage.on('console', msg => {
      console.log(`[PLAYER] ${msg.text()}`);
    });

    console.log('🎮 Starting manual join flow debug...');

    // STEP 1: Manager creates room
    console.log('\n📋 STEP 1: Manager creates game room');
    await managerPage.goto(`${BASE_URL}/manager`);
    await managerPage.waitForSelector('input[placeholder*="password"], input[type="password"]', { timeout: 10000 });
    await managerPage.fill('input[placeholder*="password"], input[type="password"]', MANAGER_PASSWORD);
    await managerPage.click('button:has-text("Create Room"), button:has-text("Submit")');
    
    await managerPage.waitForSelector('.mb-10.rotate-3.rounded-md.bg-white', { timeout: 15000 });
    const pinElement = await managerPage.locator('.mb-10.rotate-3.rounded-md.bg-white').first();
    gamePin = await pinElement.textContent();
    gamePin = gamePin.replace(/[^A-Z0-9]/g, '');
    
    console.log(`✅ Manager created room with PIN: ${gamePin}`);

    // STEP 2: Player starts manual join
    console.log(`\n👤 STEP 2: Player navigating to home page`);
    await playerPage.goto(BASE_URL);
    
    // Wait for PIN input and enter PIN
    console.log('🔍 Looking for PIN input field...');
    await playerPage.waitForSelector('input[placeholder*="PIN"], input[placeholder*="pin"]', { timeout: 10000 });
    console.log('✅ PIN input found, entering PIN...');
    
    await playerPage.fill('input[placeholder*="PIN"], input[placeholder*="pin"]', gamePin);
    
    // Take screenshot before submitting PIN
    await playerPage.screenshot({ path: 'test-results/before-pin-submit.png', fullPage: true });
    console.log('📸 Screenshot taken before PIN submit');
    
    console.log(`🚀 Submitting PIN: ${gamePin}`);
    await playerPage.click('button:has-text("Submit")');
    
    console.log('⏳ Waiting for PIN validation and transition to username form...');
    
    // Wait a moment to see what happens
    await playerPage.waitForTimeout(2000);
    await playerPage.screenshot({ path: 'test-results/after-pin-submit-2s.png', fullPage: true });
    console.log('📸 Screenshot taken 2 seconds after PIN submit');
    
    // Try to wait for username input
    try {
      await playerPage.waitForSelector('input[placeholder*="Username"], input[placeholder*="username"]', { timeout: 15000 });
      console.log('✅ SUCCESS: Username form appeared! Manual join bug is fixed.');
      
      // Continue with username entry
      await playerPage.fill('input[placeholder*="Username"], input[placeholder*="username"]', 'TestPlayer1');
      await playerPage.click('button:has-text("Submit")');
      
      // Wait for successful join
      await playerPage.waitForURL(/\/game/, { timeout: 10000 });
      console.log('🎉 COMPLETE SUCCESS: Player joined the game!');
      
      // Check if manager sees the player
      await managerPage.waitForFunction(
        () => document.querySelector('*:has-text("TestPlayer1")') !== null,
        { timeout: 10000 }
      );
      console.log('✅ Manager can see the player in dashboard!');
      
    } catch (error) {
      console.log(`❌ BUG CONFIRMED: Username form did not appear after PIN submission`);
      console.log(`Error: ${error.message}`);
      
      // Take final screenshot to show the stuck state
      await playerPage.screenshot({ path: 'test-results/stuck-after-pin-submit.png', fullPage: true });
      console.log('📸 Screenshot taken showing stuck state');
      
      // Check what's currently visible on the page
      const currentUrl = playerPage.url();
      console.log(`Current URL: ${currentUrl}`);
      
      const bodyText = await playerPage.locator('body').textContent();
      console.log(`Current page content: ${bodyText.substring(0, 200)}...`);
      
      // Check if we can see any error messages
      const errorElements = await playerPage.locator('.error, .toast-error, [role="alert"]').count();
      console.log(`Error elements found: ${errorElements}`);
      
      if (errorElements > 0) {
        const errorText = await playerPage.locator('.error, .toast-error, [role="alert"]').first().textContent();
        console.log(`Error message: ${errorText}`);
      }
      
      throw error;
    }

    await context.close();
  });
});