const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('🎯 Single Player Complete Game Test - Focus on Final Results');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  
  const managerPage = await context.newPage();
  const playerPage = await context.newPage();
  
  let roomId = null;

  try {
    // Step 1: Manager creates room
    console.log('🎮 Manager creating room...');
    await managerPage.goto('http://localhost:3000/manager');
    await managerPage.waitForSelector('input', { timeout: 10000 });
    
    await managerPage.fill('input', 'admin123');
    await managerPage.keyboard.press('Enter');
    await managerPage.waitForTimeout(5000);
    
    // Extract room ID
    const pageContent = await managerPage.textContent('body');
    const pinMatch = pageContent.match(/([A-Z0-9]{5,6})(?=Waiting for the players)/);
    if (!pinMatch) throw new Error('Could not find room ID');
    
    roomId = pinMatch[1];
    console.log(`✅ Room created: ${roomId}`);
    
    // Step 2: Player joins
    console.log('👤 Player joining...');
    await playerPage.goto('http://localhost:3000');
    await playerPage.waitForSelector('input');
    await playerPage.fill('input', roomId);
    await playerPage.keyboard.press('Enter');
    await playerPage.waitForTimeout(2000);
    
    // Enter username
    const usernameInput = await playerPage.$('input');
    if (usernameInput) {
      await usernameInput.fill('TestPlayer');
      await playerPage.keyboard.press('Enter');
    }
    
    // Wait for player to join
    await Promise.all([
      managerPage.waitForTimeout(8000),
      playerPage.waitForTimeout(8000)
    ]);
    
    console.log('📸 Taking joined screenshot...');
    await managerPage.screenshot({ path: 'single-player-joined-manager.png', fullPage: true });
    
    // Step 3: Start game and wait longer for proper progression
    console.log('🚀 Starting game...');
    const startButton = await managerPage.$('button:has-text("Start")');
    if (startButton) {
      await startButton.click();
      console.log('✅ Game started');
    } else {
      console.log('⚠️ No start button found');
    }
    
    // Wait for game to actually start
    await Promise.all([
      managerPage.waitForTimeout(5000),
      playerPage.waitForTimeout(5000)
    ]);
    
    // Step 4: Play through ALL questions systematically
    console.log('🎮 Starting complete game playthrough...');
    
    for (let questionNum = 1; questionNum <= 10; questionNum++) {
      console.log(`\n📝 Question ${questionNum} - Waiting for question to load...`);
      
      // Wait for question to load
      await Promise.all([
        managerPage.waitForTimeout(5000),
        playerPage.waitForTimeout(5000)
      ]);
      
      // Check if we've reached final results instead of a new question
      const managerContent = await managerPage.textContent('body');
      const playerContent = await playerPage.textContent('body');
      
      console.log(`Manager content sample: ${managerContent.substring(0, 100)}`);
      console.log(`Player content sample: ${playerContent.substring(0, 100)}`);
      
      // Look for final results indicators
      if (managerContent.includes('Final') || managerContent.includes('Winner') || 
          managerContent.includes('Game Over') || managerContent.includes('Results') ||
          playerContent.includes('Final') || playerContent.includes('Winner') || 
          playerContent.includes('Game Over') || playerContent.includes('Results')) {
        console.log('🏆 FINAL RESULTS DETECTED!');
        break;
      }
      
      // Try to answer the question if available
      console.log('   🔍 Looking for answer buttons...');
      try {
        const answerButtons = await playerPage.$$('button:not(:has-text("Submit")):not(:has-text("Skip")):not(:has-text("Start"))');
        console.log(`   Found ${answerButtons.length} answer buttons`);
        
        if (answerButtons.length > 0) {
          // Choose first answer consistently
          await answerButtons[0].click();
          console.log(`   ✅ Player answered question ${questionNum}`);
        } else {
          console.log(`   ⚠️ No answer buttons found for question ${questionNum}`);
        }
      } catch (e) {
        console.log(`   ❌ Error answering question ${questionNum}:`, e.message);
      }
      
      // Wait for question to complete (full 15 seconds + buffer)
      console.log(`   ⏳ Waiting for question ${questionNum} to complete...`);
      await Promise.all([
        managerPage.waitForTimeout(20000), // 20 seconds for full question + results
        playerPage.waitForTimeout(20000)
      ]);
      
      // Look for and click any continue/next buttons
      console.log(`   🔄 Looking for continuation buttons...`);
      try {
        const managerButtons = await managerPage.$$('button:has-text("Next"), button:has-text("Continue"), button:has-text("Skip")');
        const playerButtons = await playerPage.$$('button:has-text("Next"), button:has-text("Continue"), button:has-text("Skip")');
        
        if (managerButtons.length > 0) {
          console.log(`   Found ${managerButtons.length} manager buttons - clicking first one`);
          await managerButtons[0].click();
        } else if (playerButtons.length > 0) {
          console.log(`   Found ${playerButtons.length} player buttons - clicking first one`);
          await playerButtons[0].click();
        } else {
          console.log(`   No continuation buttons found - may be at end`);
        }
      } catch (e) {
        console.log(`   Could not click continuation button:`, e.message);
      }
      
      // Wait between questions
      await Promise.all([
        managerPage.waitForTimeout(3000),
        playerPage.waitForTimeout(3000)
      ]);
    }
    
    // Step 5: Final wait and capture
    console.log('\n🏆 Waiting extra time for final results to fully load...');
    await Promise.all([
      managerPage.waitForTimeout(15000),
      playerPage.waitForTimeout(15000)
    ]);
    
    // Take final screenshots
    console.log('📸 Taking FINAL RESULTS screenshots...');
    await Promise.all([
      managerPage.screenshot({ path: 'single-player-final-manager.png', fullPage: true }),
      playerPage.screenshot({ path: 'single-player-final-player.png', fullPage: true })
    ]);
    
    // Get final content for analysis
    const finalManagerContent = await managerPage.textContent('body');
    const finalPlayerContent = await playerPage.textContent('body');
    
    console.log('\n📊 FINAL CONTENT ANALYSIS:');
    console.log('Manager final content:');
    console.log(finalManagerContent.substring(0, 400));
    console.log('\nPlayer final content:');
    console.log(finalPlayerContent.substring(0, 400));
    
    console.log('\n🎉 SINGLE PLAYER COMPLETE TEST FINISHED!');
    console.log('Check these files:');
    console.log('- single-player-joined-manager.png');
    console.log('- single-player-final-manager.png'); 
    console.log('- single-player-final-player.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take error screenshots
    try {
      await managerPage.screenshot({ path: 'error-single-manager.png', fullPage: true });
      await playerPage.screenshot({ path: 'error-single-player.png', fullPage: true });
    } catch (e) {}
  }
  
  await browser.close();
})();