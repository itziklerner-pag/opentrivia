const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  
  // Manager page
  const managerPage = await context.newPage();
  await managerPage.goto('http://localhost:3000/manager');
  await managerPage.waitForTimeout(2000);
  await managerPage.fill('input', 'PASSWORD');
  await managerPage.click('button');
  await managerPage.waitForTimeout(3000);
  
  // Get the PIN
  const pinElement = await managerPage.locator('text=/^[A-Z0-9]{6}$/', { timeout: 10000 });
  const pin = await pinElement.textContent();
  console.log('PIN:', pin);
  
  // Player page
  const playerPage = await context.newPage();
  playerPage.on('console', msg => console.log('BROWSER:', msg.text()));
  
  await playerPage.goto('http://localhost:3000/');
  await playerPage.waitForLoadState('networkidle');
  await playerPage.waitForTimeout(3000);
  
  // Wait for the input to appear  
  console.log('Waiting for PIN input to appear...');
  const pinInput = await playerPage.locator('input[placeholder="PIN Code here"]');
  await pinInput.waitFor({ timeout: 10000 });
  await pinInput.fill(pin);
  await playerPage.click('button:has-text("Submit")');
  
  // Wait and check for username input
  console.log('Waiting for username input to appear...');
  await playerPage.waitForTimeout(5000);
  
  const usernameInput = await playerPage.locator('input[placeholder="Username here"]');
  const exists = await usernameInput.count() > 0;
  console.log('Username input exists:', exists);
  
  if (!exists) {
    const currentContent = await playerPage.content();
    console.log('Current page content:', currentContent.substring(0, 500));
  }
  
  await browser.close();
})();