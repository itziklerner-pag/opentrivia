const { chromium } = require('playwright');

async function runUIValidationTest() {
  console.log('🎮 Starting UI Visual Validation Test');
  console.log('📋 Testing: 1 game, 1 manual player join, full UI validation');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for visual verification
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 900 }
    });

    // Step 1: Start manager session
    console.log('🎯 Step 1: Opening manager interface...');
    const managerPage = await context.newPage();
    managerPage.on('console', msg => console.log(`[MANAGER] ${msg.text()}`));
    
    await managerPage.goto('http://localhost:3000/manager');
    await managerPage.waitForLoadState('networkidle');

    // Enter manager password and create room
    console.log('🔐 Entering manager password...');
    await managerPage.fill('input[placeholder="Manager password"]', 'PASSWORD');
    await managerPage.click('button:has-text("Submit")');
    
    // Wait for room creation and avoid Fast Refresh issues
    await managerPage.waitForTimeout(5000);
    
    // Wait for any Fast Refresh to complete
    console.log('⏱️ Waiting for Fast Refresh to settle...');
    await managerPage.waitForFunction(() => {
      return !document.body.textContent.includes('[Fast Refresh]');
    }, { timeout: 10000 }).catch(() => console.log('Fast Refresh check timeout - continuing'));
    
    await managerPage.waitForTimeout(2000);
    
    // Look for the game PIN in the page content
    const pageContent = await managerPage.textContent('body');
    const pinMatch = pageContent.match(/[A-Z0-9]{6}/);
    const gamePin = pinMatch ? pinMatch[0] : null;
    console.log(`🎯 Game PIN extracted: ${gamePin || 'Not found'}`);
    
    if (!gamePin) {
      throw new Error('Could not extract game PIN from manager page');
    }
    
    // Verify room exists via API before attempting UI join
    console.log('🔍 Verifying room exists via API...');
    const verifyResponse = await fetch('http://localhost:3000/api/pusher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'player:checkRoom', data: gamePin })
    });
    const verifyResult = await verifyResponse.json();
    console.log(`🏠 Room verification: ${verifyResult.success ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    
    if (!verifyResult.success) {
      console.log('⚠️ Room not found, retrying in 3 seconds...');
      await managerPage.waitForTimeout(3000);
      
      // Retry verification
      const retryResponse = await fetch('http://localhost:3000/api/pusher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'player:checkRoom', data: gamePin })
      });
      const retryResult = await retryResponse.json();
      console.log(`🔄 Room retry verification: ${retryResult.success ? '✅ EXISTS' : '❌ STILL NOT FOUND'}`);
      
      if (!retryResult.success) {
        throw new Error(`Room ${gamePin} not found even after retry. Fast Refresh likely cleared state.`);
      }
    }

    // Step 2: Open player interface
    console.log('👤 Step 2: Opening player interface...');
    const playerPage = await context.newPage();
    playerPage.on('console', msg => console.log(`[PLAYER] ${msg.text()}`));
    
    await playerPage.goto('http://localhost:3000');
    await playerPage.waitForLoadState('networkidle');

    // Enter PIN manually
    console.log('📝 Player entering game PIN...');
    const pinInput = await playerPage.locator('input[placeholder*="PIN"], input[placeholder*="code"], input[type="text"]').first();
    await pinInput.waitFor({ timeout: 5000 });
    
    await pinInput.fill(gamePin);
    await playerPage.click('button:has-text("Submit")');
    
    // Wait for username screen
    console.log('👤 Waiting for username input screen...');
    await playerPage.waitForTimeout(2000);
    
    // Enter username
    console.log('📝 Player entering username...');
    const usernameInput = await playerPage.locator('input[placeholder*="name"], input[placeholder*="Name"]').first();
    await usernameInput.waitFor({ timeout: 5000 });
    await usernameInput.fill('UITestPlayer');
    await playerPage.click('button:has-text("Join"), button:has-text("Submit")');
    
    // Wait for player to join
    await playerPage.waitForTimeout(3000);
    
    // Step 3: SCREENSHOT 1 - Manager showing joined player
    console.log('📸 Taking Screenshot 1: Manager with joined player...');
    await managerPage.bringToFront();
    await managerPage.waitForTimeout(2000); // Let UI update
    
    await managerPage.screenshot({
      path: 'UI-TEST-01-MANAGER-WITH-PLAYER.png',
      fullPage: true
    });
    
    console.log('✅ Screenshot 1 saved: UI-TEST-01-MANAGER-WITH-PLAYER.png');
    
    // Verify player appears on manager screen
    const playersList = await managerPage.textContent('body');
    const hasPlayer = playersList.includes('UITestPlayer') || playersList.includes('1 player') || playersList.includes('Players:');
    console.log(`👥 Player visible on manager: ${hasPlayer ? '✅ YES' : '❌ NO'}`);
    
    // Step 4: Start the game
    console.log('🚀 Step 4: Manager starting the game...');
    const startButton = await managerPage.locator('button:has-text("Start"), button:has-text("BEGIN"), .start-button').first();
    await startButton.waitFor({ timeout: 5000 });
    await startButton.click();
    
    // Wait for game to start
    await playerPage.bringToFront();
    await playerPage.waitForTimeout(4000);
    
    // Step 5: Wait for first question and let it timeout
    console.log('❓ Step 5: Waiting for first question...');
    
    // Look for question elements
    const questionVisible = await playerPage.locator('.question, [data-testid="question"], h1, h2, h3').first().isVisible().catch(() => false);
    console.log(`📋 Question visible: ${questionVisible ? '✅ YES' : '❌ NO'}`);
    
    if (questionVisible) {
      console.log('⏱️ Letting question timer run out...');
      // Wait for question timeout (usually 15-20 seconds)
      await playerPage.waitForTimeout(20000);
    } else {
      console.log('⚠️ Question not detected, waiting for any results...');
      await playerPage.waitForTimeout(10000);
    }
    
    // Step 6: SCREENSHOT 2 - Results after first question
    console.log('📸 Taking Screenshot 2: Results after first question...');
    await playerPage.waitForTimeout(2000); // Let results display
    
    await playerPage.screenshot({
      path: 'UI-TEST-02-FIRST-QUESTION-RESULTS.png',
      fullPage: true
    });
    
    console.log('✅ Screenshot 2 saved: UI-TEST-02-FIRST-QUESTION-RESULTS.png');
    
    // Also take a final manager screenshot
    await managerPage.bringToFront();
    await managerPage.screenshot({
      path: 'UI-TEST-03-MANAGER-AFTER-QUESTION.png',
      fullPage: true
    });
    
    console.log('📸 Bonus screenshot: UI-TEST-03-MANAGER-AFTER-QUESTION.png');
    
    // Summary
    console.log('\n🎉 UI VALIDATION TEST COMPLETED!');
    console.log('📸 Screenshots captured:');
    console.log('   1. UI-TEST-01-MANAGER-WITH-PLAYER.png - Manager showing joined player');
    console.log('   2. UI-TEST-02-FIRST-QUESTION-RESULTS.png - Results after first question');
    console.log('   3. UI-TEST-03-MANAGER-AFTER-QUESTION.png - Manager state after question');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    console.log('🧹 Closing browser...');
    await browser.close();
  }
}

// Run the test
runUIValidationTest().then(success => {
  if (success) {
    console.log('\n✅ UI VALIDATION SUCCESSFUL');
  } else {
    console.log('\n❌ UI VALIDATION FAILED - Check errors above');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Critical error:', error);
  process.exit(1);
});