const { chromium } = require('playwright');

(async () => {
  console.log('🔧 Quick Manager Test - Check Start Button Functionality');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const managerPage = await context.newPage();
  
  try {
    // Step 1: Manager creates room
    console.log('🎮 Manager creating room...');
    await managerPage.goto('http://localhost:3001/manager');
    await managerPage.waitForSelector('input', { timeout: 10000 });
    
    await managerPage.fill('input', 'admin123');
    await managerPage.keyboard.press('Enter');
    await managerPage.waitForTimeout(3000);
    
    // Check if room was created successfully
    const hasRoomId = await managerPage.$('.rotate-3');
    if (!hasRoomId) {
      console.log('❌ Room creation failed');
      await browser.close();
      return;
    }
    
    console.log('✅ Room created successfully, checking for Start button...');
    
    // Look for Start/Next button
    const startButton = await managerPage.$('button');
    if (!startButton) {
      console.log('❌ Start button not found');
      await browser.close();
      return;
    }
    
    const buttonText = await startButton.textContent();
    console.log('🔘 Found button with text:', buttonText);
    
    console.log('✅ Clicking start button...');
    await startButton.click();
    
    // Wait a few seconds to see if state transitions
    await managerPage.waitForTimeout(5000);
    
    const currentContent = await managerPage.textContent('body');
    console.log('📍 Page content after start click:', currentContent.substring(0, 200));
    
    // Check if we transitioned away from "Waiting for players"
    if (currentContent.includes('Waiting for the players')) {
      console.log('❌ Still showing "Waiting for players" - transition failed');
    } else {
      console.log('✅ Successfully transitioned away from waiting state');
    }
    
    console.log('🎯 Test completed - check browser for visual feedback');
    
    // Keep browser open for 30 seconds to observe
    await managerPage.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
})();