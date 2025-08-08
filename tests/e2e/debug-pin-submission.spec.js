const { test, expect } = require('@playwright/test');

test('Debug PIN submission flow', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => {
    console.log(`[CONSOLE] ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.error(`[ERROR] ${error.message}`);
  });

  // Go to main page
  console.log('🎯 Loading main page...');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Find PIN input
  console.log('🔍 Looking for PIN input...');
  const pinInput = page.locator('input[placeholder*="PIN"]');
  await expect(pinInput).toBeVisible({ timeout: 10000 });
  
  // Enter test PIN
  console.log('✏️ Entering PIN: TESTPIN...');
  await pinInput.fill('TESTPIN');
  
  // Click submit and watch for API calls
  console.log('🚀 Clicking submit button...');
  const submitButton = page.locator('button:has-text("Submit")');
  await expect(submitButton).toBeVisible();
  
  await submitButton.click();
  
  // Wait and see what happens
  console.log('⏳ Waiting 5 seconds to see console output...');
  await page.waitForTimeout(5000);
  
  console.log('✅ Debug test completed');
});