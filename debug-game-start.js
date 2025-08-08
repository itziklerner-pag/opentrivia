const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  
  console.log('🎮 Testing game start issue...');
  
  // Manager page
  const managerPage = await context.newPage();
  managerPage.on('console', msg => console.log(`[MANAGER] ${msg.text()}`));
  
  await managerPage.goto('http://localhost:3001/manager');
  await managerPage.waitForTimeout(2000);
  
  // Create room
  await managerPage.fill('input', 'PASSWORD');
  await managerPage.click('button');
  await managerPage.waitForTimeout(3000);
  
  // Get PIN
  let gamePin = '';
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const pinElement = await managerPage.locator('text=/[A-Z0-9]{4,8}/').first();
      if (await pinElement.isVisible()) {
        gamePin = await pinElement.textContent();
        break;
      }
    } catch (e) {}
    await managerPage.waitForTimeout(500);
  }
  
  console.log(`📍 Game PIN: ${gamePin}`);
  
  // Player page
  const playerPage = await context.newPage();
  playerPage.on('console', msg => console.log(`[PLAYER] ${msg.text()}`));
  
  await playerPage.goto('http://localhost:3001/');
  await playerPage.waitForTimeout(2000);
  
  // Join game
  await playerPage.fill('input[placeholder*="PIN"]', gamePin);
  await playerPage.click('button:has-text("Submit")');
  await playerPage.waitForTimeout(2000);
  
  // Enter username
  try {
    await playerPage.fill('input[placeholder*="name" i]', 'DebugPlayer');
    await playerPage.click('button:has-text("Submit")');
    console.log('✅ Player joined successfully');
    await playerPage.waitForTimeout(3000);
  } catch (e) {
    console.log('❌ Player join failed');
  }
  
  // Wait a bit before starting game
  console.log('⏰ Waiting 5 seconds before starting game...');
  await managerPage.waitForTimeout(5000);
  
  // Start game
  console.log('🎮 Attempting to start game...');
  try {
    const startButton = managerPage.locator('button:has-text("Start")');
    if (await startButton.isVisible({ timeout: 3000 })) {
      await startButton.click();
      console.log('✅ Start button clicked');
      
      // Wait to see what happens
      await managerPage.waitForTimeout(5000);
      
      // Check for questions on both pages
      const managerContent = await managerPage.textContent('body');
      const playerContent = await playerPage.textContent('body');
      
      console.log('📊 Manager page contains:', managerContent.includes('Question') ? 'QUESTIONS' : 'NO QUESTIONS');
      console.log('📊 Player page contains:', playerContent.includes('Question') ? 'QUESTIONS' : 'NO QUESTIONS');
      
      // Take screenshots
      await managerPage.screenshot({ path: 'debug-manager-after-start.png', fullPage: true });
      await playerPage.screenshot({ path: 'debug-player-after-start.png', fullPage: true });
      
    } else {
      console.log('⚠️ Start button not visible');
    }
  } catch (e) {
    console.log('❌ Game start error:', e.message);
  }
  
  console.log('🏁 Debug test completed');
  await browser.close();
})();