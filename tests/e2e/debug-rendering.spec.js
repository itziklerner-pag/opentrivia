const { test, expect } = require('@playwright/test');

test('Debug what components are being rendered', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => {
    console.log(`[CONSOLE] ${msg.text()}`);
  });

  console.log('🎯 Loading main page...');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Check what's actually rendered
  console.log('📄 Taking screenshot...');
  await page.screenshot({ path: 'debug-main-page.png', fullPage: true });
  
  // Check for PIN input
  const pinInput = page.locator('input[placeholder*="PIN"]');
  const pinInputVisible = await pinInput.isVisible();
  console.log('🔍 PIN input visible:', pinInputVisible);
  
  // Check for username input
  const usernameInput = page.locator('input[placeholder*="name" i]');
  const usernameInputVisible = await usernameInput.isVisible();
  console.log('👤 Username input visible:', usernameInputVisible);
  
  // Check for loading spinner
  const loadingSpinner = page.locator('.animate-spin');
  const loadingVisible = await loadingSpinner.isVisible();
  console.log('⏳ Loading spinner visible:', loadingVisible);
  
  // Get all visible text
  const bodyText = await page.locator('body').textContent();
  console.log('📝 Page text content:', bodyText.substring(0, 200) + '...');
  
  // Check what form is visible
  const forms = await page.locator('form').count();
  console.log('📋 Number of forms:', forms);
  
  if (forms > 0) {
    for (let i = 0; i < forms; i++) {
      const form = page.locator('form').nth(i);
      const formText = await form.textContent();
      console.log(`📋 Form ${i + 1} text:`, formText);
    }
  }
});