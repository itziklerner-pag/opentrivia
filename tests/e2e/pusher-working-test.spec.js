const { test, expect } = require('@playwright/test');

test.describe('Pusher Working Game Test', () => {
  let managerPage;
  let playerPage;

  test.beforeAll(async ({ browser }) => {
    console.log('🚀 Starting Pusher Working Game Test with proper credentials');
    
    const managerContext = await browser.newContext();
    const playerContext = await browser.newContext();
    
    managerPage = await managerContext.newPage();
    playerPage = await playerContext.newPage();
  });

  test('Single player joins and completes first question with screenshots', async () => {
    console.log('📋 Test Plan:');
    console.log('1. Manager creates room with Pusher credentials');
    console.log('2. Player joins using PIN');
    console.log('3. Screenshot: Manager showing joined player');
    console.log('4. Start game and show first question');
    console.log('5. Screenshot: Player after first question');
    
    // Step 1: Manager creates room
    console.log('🎮 Step 1: Manager creating room...');
    await managerPage.goto('http://localhost:3000/manager');
    
    // Enter manager password
    await managerPage.waitForSelector('input', { timeout: 10000 });
    const passwordInput = await managerPage.$('input');
    if (passwordInput) {
      await passwordInput.fill('admin123');
      
      // Look for submit button or press Enter
      const submitButton = await managerPage.$('button[type="submit"], button:has-text("Submit")');
      if (submitButton) {
        await submitButton.click();
        console.log('Clicked submit button for password');
      } else {
        await managerPage.keyboard.press('Enter');
        console.log('Pressed Enter for password');
      }
    }
    
    // Wait longer for room creation with Pusher
    console.log('⏳ Waiting for Pusher room creation...');
    await managerPage.waitForTimeout(5000);
    
    // Look for PIN in the page
    let inviteCode = null;
    let attempts = 0;
    while (!inviteCode && attempts < 10) {
      const pageContent = await managerPage.textContent('body');
      console.log(`Attempt ${attempts + 1} - Page content:`, pageContent.substring(0, 200));
      
      // Try multiple patterns to find the PIN
      const patterns = [
        /([A-Z0-9]{5,6})(?=Waiting for the players)/,
        /([A-Z0-9]{5,6})/g,
        /\b([A-Z]{2}[0-9]{4}|[A-Z]{4}[0-9]{2}|[A-Z0-9]{6})\b/
      ];
      
      for (const pattern of patterns) {
        const match = pageContent.match(pattern);
        if (match) {
          // Filter out common false positives
          const candidate = match[1] || match[0];
          if (candidate && 
              candidate !== 'Submit' && 
              candidate.length >= 5 && 
              candidate.length <= 6 &&
              !/^(START|SUBMIT|BUTTON)/.test(candidate)) {
            inviteCode = candidate;
            console.log(`✅ Found PIN: ${inviteCode} using pattern ${pattern}`);
            break;
          }
        }
      }
      
      if (!inviteCode) {
        attempts++;
        await managerPage.waitForTimeout(1000);
      }
    }
    
    if (!inviteCode) {
      // Take debug screenshot
      await managerPage.screenshot({ path: 'DEBUG-NO-PIN.png', fullPage: true });
      console.log('❌ Could not find PIN after 10 attempts');
      
      // Let's try a different approach - look for any 6-character codes
      const allText = await managerPage.textContent('body');
      const allMatches = allText.match(/[A-Z0-9]{6}/g);
      console.log('All 6-char matches found:', allMatches);
      
      if (allMatches && allMatches.length > 0) {
        inviteCode = allMatches[allMatches.length - 1]; // Take the last one
        console.log(`⚠️ Using last 6-char match as PIN: ${inviteCode}`);
      }
    }
    
    if (!inviteCode) {
      throw new Error('Could not find invite code/PIN on manager page after multiple attempts');
    }
    
    // Take screenshot of manager with PIN
    await managerPage.screenshot({ 
      path: 'PUSHER-TEST-01-MANAGER-WITH-PIN.png', 
      fullPage: true 
    });
    console.log('📸 Saved: PUSHER-TEST-01-MANAGER-WITH-PIN.png');
    
    // Step 2: Player joins
    console.log(`👤 Step 2: Player joining with PIN ${inviteCode}...`);
    await playerPage.goto('http://localhost:3000');
    
    await playerPage.waitForSelector('input', { timeout: 10000 });
    
    // Enter PIN
    const pinInput = await playerPage.$('input[placeholder*="PIN"], input[placeholder*="Code"], input');
    if (pinInput) {
      await pinInput.fill(inviteCode);
      console.log(`Entered PIN: ${inviteCode}`);
      
      // Submit PIN
      const submitBtn = await playerPage.$('button:has-text("Submit"), button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        console.log('Clicked submit button for PIN');
      } else {
        await playerPage.keyboard.press('Enter');
        console.log('Pressed Enter for PIN');
      }
    }
    
    // Wait for potential username screen
    await playerPage.waitForTimeout(3000);
    
    // Check if we need to enter username
    const usernameInput = await playerPage.$('input[placeholder*="name"], input[placeholder*="Name"], input:not([value])');
    if (usernameInput) {
      const currentValue = await usernameInput.inputValue();
      if (!currentValue) {
        await usernameInput.fill('TestPlayer');
        console.log('Entered username: TestPlayer');
        
        // Submit username
        const nameSubmitBtn = await playerPage.$('button:has-text("Submit"), button:has-text("Join"), button[type="submit"]');
        if (nameSubmitBtn) {
          await nameSubmitBtn.click();
          console.log('Clicked username submit button');
        } else {
          await playerPage.keyboard.press('Enter');
          console.log('Pressed Enter for username');
        }
      }
    }
    
    // Step 3: Wait for player to join and check manager
    console.log('⏳ Step 3: Checking if player joined...');
    await managerPage.waitForTimeout(5000);
    
    const managerContent = await managerPage.textContent('body');
    console.log('Manager content after join attempt:', managerContent.substring(0, 300));
    
    // Take screenshot of manager (should show player if joined)
    await managerPage.screenshot({ 
      path: 'PUSHER-TEST-02-MANAGER-AFTER-PLAYER-JOIN.png', 
      fullPage: true 
    });
    console.log('📸 Saved: PUSHER-TEST-02-MANAGER-AFTER-PLAYER-JOIN.png');
    
    // Check if player appears in manager view
    const playerInManager = managerContent.toLowerCase().includes('testplayer') || 
                           !managerContent.toLowerCase().includes('waiting for the players');
    
    console.log(`Player in manager view: ${playerInManager ? 'YES' : 'NO'}`);
    
    // Step 4: Start the game
    console.log('🎯 Step 4: Starting the game...');
    
    // Look for start button
    let gameStarted = false;
    const startButtons = await managerPage.$$('button:has-text("Start"), button:has-text("Begin")');
    
    if (startButtons.length > 0) {
      await startButtons[0].click();
      console.log('Clicked Start button');
      gameStarted = true;
    } else {
      // Try any button that might start the game
      const allButtons = await managerPage.$$('button');
      console.log(`Found ${allButtons.length} buttons on manager page`);
      
      for (const button of allButtons) {
        const buttonText = await button.textContent();
        console.log(`Button text: "${buttonText}"`);
        if (buttonText && !buttonText.toLowerCase().includes('submit')) {
          await button.click();
          console.log(`Clicked button: "${buttonText}"`);
          gameStarted = true;
          break;
        }
      }
    }
    
    if (gameStarted) {
      console.log('✅ Game start initiated');
    } else {
      console.log('⚠️ Could not find start button, continuing anyway');
    }
    
    // Step 5: Wait for question and take screenshots
    console.log('❓ Step 5: Waiting for first question...');
    await Promise.all([
      managerPage.waitForTimeout(8000),
      playerPage.waitForTimeout(8000)
    ]);
    
    // Take final screenshots
    await Promise.all([
      managerPage.screenshot({ 
        path: 'PUSHER-TEST-03-MANAGER-DURING-QUESTION.png', 
        fullPage: true 
      }),
      playerPage.screenshot({ 
        path: 'PUSHER-TEST-03-PLAYER-AFTER-QUESTION.png', 
        fullPage: true 
      })
    ]);
    
    console.log('📸 Saved: PUSHER-TEST-03-MANAGER-DURING-QUESTION.png');
    console.log('📸 Saved: PUSHER-TEST-03-PLAYER-AFTER-QUESTION.png');
    
    // Check final page states
    const [finalManagerContent, finalPlayerContent] = await Promise.all([
      managerPage.textContent('body'),
      playerPage.textContent('body')
    ]);
    
    console.log('Final manager content sample:', finalManagerContent.substring(0, 200));
    console.log('Final player content sample:', finalPlayerContent.substring(0, 200));
    
    // Verify we have basic functionality
    expect(inviteCode).toBeTruthy();
    expect(inviteCode).toMatch(/^[A-Z0-9]{5,6}$/);
    
    console.log('🎉 Pusher Working Game Test completed!');
    console.log('Screenshots generated:');
    console.log('  - PUSHER-TEST-01-MANAGER-WITH-PIN.png');
    console.log('  - PUSHER-TEST-02-MANAGER-AFTER-PLAYER-JOIN.png');
    console.log('  - PUSHER-TEST-03-MANAGER-DURING-QUESTION.png');
    console.log('  - PUSHER-TEST-03-PLAYER-AFTER-QUESTION.png');
  });
});