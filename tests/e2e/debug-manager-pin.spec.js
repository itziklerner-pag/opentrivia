const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const MANAGER_PASSWORD = 'PASSWORD'; // From config.mjs

test.describe('Debug Manager PIN Creation', () => {
  test('Create room and extract PIN', async ({ page }) => {
    console.log('🎮 Testing manager PIN creation...');

    // Navigate to manager page
    await page.goto(`${BASE_URL}/manager`);
    
    // Wait for password input
    await page.waitForSelector('input[placeholder*="password"], input[type="password"]', { timeout: 10000 });
    await page.fill('input[placeholder*="password"], input[type="password"]', MANAGER_PASSWORD);
    
    // Click create room button
    await page.click('button:has-text("Create Room"), button:has-text("Submit")');
    
    console.log('⏳ Waiting for room creation...');
    
    // Wait for PIN to appear (using the correct selector)
    await page.waitForSelector('.mb-10.rotate-3.rounded-md.bg-white', { timeout: 15000 });
    
    // Extract PIN
    const pinElement = await page.locator('.mb-10.rotate-3.rounded-md.bg-white').first();
    const gamePin = await pinElement.textContent();
    const cleanPin = gamePin.replace(/[^A-Z0-9]/g, '');
    
    console.log(`✅ Game room created with PIN: ${cleanPin}`);
    expect(cleanPin).toMatch(/^[A-Z0-9]{6}$/);
    
    // Take a screenshot to verify
    await page.screenshot({ path: 'test-results/manager-pin-success.png', fullPage: true });
    
    console.log('✅ Manager PIN creation test completed successfully!');
  });
});