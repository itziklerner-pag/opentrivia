const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  
  // Manager page
  console.log('🎮 Starting quick game test...');
  const managerPage = await context.newPage();
  await managerPage.goto('http://localhost:3000/manager');
  await managerPage.waitForTimeout(3000);
  
  // Create room
  await managerPage.fill('input', 'PASSWORD');
  await managerPage.click('button');
  await managerPage.waitForTimeout(4000);
  
  // Get PIN
  const pinElement = await managerPage.locator('text=/^[A-Z0-9]{6}$/', { timeout: 10000 });
  const pin = await pinElement.textContent();
  console.log('📍 Game PIN:', pin);
  
  // Player page
  const playerPage = await context.newPage();
  await playerPage.goto('http://localhost:3000/');
  await playerPage.waitForTimeout(3000);
  
  // Join game
  await playerPage.fill('input[placeholder*="PIN"]', pin);
  await playerPage.click('button:has-text("Submit")');
  await playerPage.waitForTimeout(3000);
  
  // Enter username
  try {
    const usernameInput = await playerPage.locator('input[placeholder*="name" i]');
    await usernameInput.fill('TestPlayer');
    await playerPage.click('button:has-text("Submit")');
    console.log('✅ Player joined successfully');
  } catch (e) {
    console.log('❌ Player join failed:', e.message);
  }
  
  await playerPage.waitForTimeout(3000);
  
  // Start game from manager
  try {
    const startButton = managerPage.locator('button:has-text("Start")');
    if (await startButton.isVisible({ timeout: 3000 })) {
      await startButton.click();
      console.log('✅ Game started');
      await managerPage.waitForTimeout(5000);
      
      // Take screenshots of current state
      await managerPage.screenshot({ path: 'quick-test-manager.png', fullPage: true });
      await playerPage.screenshot({ path: 'quick-test-player.png', fullPage: true });
      console.log('📸 Screenshots taken');
      
      // Look for game elements
      const managerContent = await managerPage.textContent('body');
      const playerContent = await playerPage.textContent('body');
      
      if (managerContent.includes('Question') || managerContent.includes('Adobe')) {
        console.log('🎯 Manager shows question content');
      }
      if (playerContent.includes('Question') || playerContent.includes('Adobe')) {
        console.log('🎯 Player shows question content');
      }
    } else {
      console.log('⚠️ Start button not found');
    }
  } catch (e) {
    console.log('❌ Game start failed:', e.message);
  }
  
  // Wait a bit more to see what happens
  await managerPage.waitForTimeout(5000);
  
  // Final screenshots
  await managerPage.screenshot({ path: 'quick-test-final-manager.png', fullPage: true });
  await playerPage.screenshot({ path: 'quick-test-final-player.png', fullPage: true });
  
  console.log('🏁 Quick test completed');
  await browser.close();
})();