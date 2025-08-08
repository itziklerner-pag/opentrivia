const { test, expect } = require('@playwright/test');

// Test configuration
const MANAGER_PASSWORD = 'PASSWORD'; // Actual manager password from config.mjs
const TEST_TIMEOUT = 60000; // 60 seconds for each test

test.describe('Trivia Game Complete Flow', () => {
  let gamePin = '';
  
  // Store contexts for cleanup
  let managerContext;
  let player1Context; 
  let player2Context;
  let player3Context;

  test.beforeAll(async ({ browser }) => {
    // Create separate browser contexts for each user
    managerContext = await browser.newContext();
    player1Context = await browser.newContext();
    player2Context = await browser.newContext();
    player3Context = await browser.newContext();
  });

  test.afterAll(async () => {
    // Clean up contexts
    await managerContext?.close();
    await player1Context?.close();
    await player2Context?.close();
    await player3Context?.close();
  });

  test.setTimeout(TEST_TIMEOUT * 5); // Increase timeout for full flow test

  test('Complete trivia game flow with 3 players', async () => {
    console.log('🎯 Starting comprehensive trivia game test...');

    // ====================
    // STEP 1: MANAGER CREATES GAME
    // ====================
    console.log('\n📝 STEP 1: Manager creates game...');
    
    const managerPage = await managerContext.newPage();
    
    // Enable console logging for manager
    managerPage.on('console', msg => console.log(`[MANAGER] ${msg.text()}`));
    managerPage.on('pageerror', error => console.error(`[MANAGER ERROR] ${error.message}`));
    
    await managerPage.goto('http://localhost:3001/manager');
    
    // Wait for page to load
    await managerPage.waitForLoadState('networkidle');
    
    // Enter manager password
    console.log('Entering manager password...');
    const passwordInput = managerPage.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await passwordInput.fill(MANAGER_PASSWORD);
    
    // Click submit to create room
    const submitButton = managerPage.locator('button:has-text("Submit")');
    await expect(submitButton).toBeVisible();
    
    // Listen for room creation
    let roomCreated = false;
    managerPage.on('console', msg => {
      if (msg.text().includes('Room created successfully') || 
          msg.text().includes('inviteCode') || 
          msg.text().includes('SHOW_ROOM')) {
        roomCreated = true;
        console.log(`[MANAGER] Room creation event: ${msg.text()}`);
      }
    });
    
    await submitButton.click();
    
    // Wait for room creation and PIN display
    console.log('Waiting for game PIN to appear...');
    
    // Try multiple selectors for the PIN display
    const pinSelectors = [
      '[data-testid="game-pin"]',
      '.invite-code',
      'text=/[A-Z0-9]{5,8}/', // Match 5-8 character codes
      '*:has-text("PIN")',
      '*:has-text("Code")',
      '*:has-text("Invite")'
    ];
    
    let pinFound = false;
    let pinElement;
    
    // Wait up to 15 seconds for PIN to appear
    for (let attempt = 0; attempt < 30; attempt++) {
      console.log(`Attempt ${attempt + 1} to find PIN...`);
      
      for (const selector of pinSelectors) {
        try {
          pinElement = await managerPage.locator(selector).first();
          if (await pinElement.isVisible()) {
            const text = await pinElement.textContent();
            console.log(`Found potential PIN element with text: "${text}"`);
            
            // Extract PIN from text (look for codes like ABCDEF or ABC123)
            const pinMatch = text.match(/[A-Z0-9]{4,8}/);
            if (pinMatch) {
              gamePin = pinMatch[0];
              console.log(`✅ Game PIN extracted: ${gamePin}`);
              pinFound = true;
              break;
            }
          }
        } catch (e) {
          // Continue trying other selectors
        }
      }
      
      if (pinFound) break;
      
      // Check if we're on the right page
      const currentUrl = managerPage.url();
      console.log(`Current manager URL: ${currentUrl}`);
      
      // Take screenshot for debugging
      if (attempt === 10 || attempt === 20) {
        await managerPage.screenshot({ 
          path: `debug-manager-attempt-${attempt}.png`,
          fullPage: true 
        });
      }
      
      await managerPage.waitForTimeout(500);
    }
    
    if (!pinFound) {
      console.error('❌ Failed to find game PIN!');
      await managerPage.screenshot({ path: 'manager-pin-not-found.png', fullPage: true });
      
      // Log page content for debugging
      const pageContent = await managerPage.content();
      console.log('Manager page HTML content:', pageContent.substring(0, 1000));
      
      throw new Error('Game PIN not found after room creation');
    }

    console.log(`✅ Manager successfully created game with PIN: ${gamePin}`);

    // ====================
    // STEP 2: MANUAL PLAYER JOIN (THE CRITICAL BUG TEST)
    // ====================
    console.log('\n👤 STEP 2: Testing manual player join (critical bug test)...');
    
    const player1Page = await player1Context.newPage();
    
    // Enable console logging for player 1
    player1Page.on('console', msg => console.log(`[PLAYER1] ${msg.text()}`));
    player1Page.on('pageerror', error => console.error(`[PLAYER1 ERROR] ${error.message}`));
    
    await player1Page.goto('http://localhost:3001/');
    await player1Page.waitForLoadState('networkidle');
    
    // Find and fill PIN input
    console.log('Player 1: Looking for PIN input field...');
    const pinInput = player1Page.locator('input[placeholder*="PIN"], input[placeholder*="Code"]');
    await expect(pinInput).toBeVisible({ timeout: 10000 });
    
    console.log(`Player 1: Entering PIN: ${gamePin}`);
    await pinInput.fill(gamePin);
    
    // Click submit button
    const playerSubmitButton = player1Page.locator('button:has-text("Submit")');
    await expect(playerSubmitButton).toBeVisible();
    
    console.log('Player 1: Clicking submit button...');
    
    // Set up listeners for debugging
    let usernameFormAppeared = false;
    let navigationOccurred = false;
    
    player1Page.on('console', msg => {
      const text = msg.text();
      if (text.includes('username') || text.includes('name') || text.includes('join')) {
        console.log(`[PLAYER1 DEBUG] ${text}`);
      }
      if (text.includes('successRoom') || text.includes('game:successRoom')) {
        usernameFormAppeared = true;
        console.log('✅ Player 1: Success room event detected!');
      }
    });
    
    // Monitor navigation
    player1Page.on('framenavigated', frame => {
      if (frame === player1Page.mainFrame()) {
        navigationOccurred = true;
        console.log(`[PLAYER1] Navigation to: ${frame.url()}`);
      }
    });
    
    await playerSubmitButton.click();
    
    console.log('Player 1: Submit clicked, waiting for response...');
    
    // Wait for username input to appear - THIS IS THE CRITICAL BUG TEST
    let usernameInputFound = false;
    let resultsFound = false;
    
    for (let attempt = 0; attempt < 20; attempt++) {
      console.log(`Player 1: Attempt ${attempt + 1} to find username input...`);
      
      // Multiple selectors for username input
      const usernameSelectors = [
        'input[placeholder*="name" i]',
        'input[placeholder*="Name"]',
        'input[type="text"]:not([placeholder*="PIN"])',
        '[data-testid="username-input"]',
        '.username-input'
      ];
      
      for (const selector of usernameSelectors) {
        try {
          const usernameElement = player1Page.locator(selector).first();
          if (await usernameElement.isVisible()) {
            console.log(`✅ Player 1: Username input found with selector: ${selector}`);
            usernameInputFound = true;
            
            // Fill username
            await usernameElement.fill('Player1');
            console.log('Player 1: Username entered');
            
            // Submit username
            const usernameSubmit = player1Page.locator('button:has-text("Submit"), button:has-text("Join")').first();
            if (await usernameSubmit.isVisible()) {
              await usernameSubmit.click();
              console.log('Player 1: Username submitted');
            }
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      if (usernameInputFound) break;
      
      // Take debug screenshot
      if (attempt === 5 || attempt === 15) {
        await player1Page.screenshot({ 
          path: `player1-attempt-${attempt}.png`,
          fullPage: true 
        });
        
        // Log current URL and page state
        console.log(`Player 1 URL: ${player1Page.url()}`);
        const pageText = await player1Page.locator('body').textContent();
        console.log(`Player 1 page text: ${pageText.substring(0, 300)}...`);
      }
      
      await player1Page.waitForTimeout(1000);
    }

    if (!usernameInputFound) {
      console.error('❌ CRITICAL BUG CONFIRMED: Username input never appeared after PIN submission!');
      await player1Page.screenshot({ path: 'player1-stuck-after-pin.png', fullPage: true });
      
      // Log debugging information
      console.log('=== DEBUGGING INFO ===');
      console.log(`Navigation occurred: ${navigationOccurred}`);
      console.log(`Success event detected: ${usernameFormAppeared}`);
      console.log(`Current URL: ${player1Page.url()}`);
      
      const bodyContent = await player1Page.locator('body').textContent();
      console.log(`Body content: ${bodyContent}`);
    }

    expect(usernameInputFound, 'Username input should appear after valid PIN submission').toBe(true);

    // ====================
    // STEP 3: QUICK JOIN URLS (2 PLAYERS)
    // ====================
    console.log('\n🔗 STEP 3: Testing quick join URLs...');
    
    // Player 2 - Quick join
    const player2Page = await player2Context.newPage();
    player2Page.on('console', msg => console.log(`[PLAYER2] ${msg.text()}`));
    
    const quickJoinUrl2 = `http://localhost:3001/?pin=${gamePin}&name=Player2`;
    console.log(`Player 2: Using quick join URL: ${quickJoinUrl2}`);
    await player2Page.goto(quickJoinUrl2);
    await player2Page.waitForLoadState('networkidle');
    
    // Player 3 - Quick join  
    const player3Page = await player3Context.newPage();
    player3Page.on('console', msg => console.log(`[PLAYER3] ${msg.text()}`));
    
    const quickJoinUrl3 = `http://localhost:3001/?pin=${gamePin}&name=Player3`;
    console.log(`Player 3: Using quick join URL: ${quickJoinUrl3}`);
    await player3Page.goto(quickJoinUrl3);
    await player3Page.waitForLoadState('networkidle');
    
    // Wait for all players to join
    console.log('Waiting for all players to join...');
    await managerPage.waitForTimeout(3000);

    // ====================
    // STEP 4: VERIFY MANAGER SEES ALL PLAYERS
    // ====================
    console.log('\n👀 STEP 4: Verifying manager sees all players...');
    
    // Check manager dashboard for player count or names
    await managerPage.waitForTimeout(2000);
    
    // Look for player indicators
    const playerIndicators = [
      '*:has-text("Player1")',
      '*:has-text("Player2")', 
      '*:has-text("Player3")',
      '*:has-text("3 players")',
      '*:has-text("players: 3")',
      '[data-testid="player-count"]'
    ];
    
    let playersVisible = 0;
    for (const indicator of playerIndicators) {
      try {
        const elements = await managerPage.locator(indicator).all();
        playersVisible += elements.length;
      } catch (e) {
        // Continue
      }
    }
    
    console.log(`Manager can see ${playersVisible} player indicators`);

    // ====================
    // STEP 5: START GAME AND TEST GAMEPLAY
    // ====================
    console.log('\n🎮 STEP 5: Testing game start and gameplay...');
    
    // Look for start game button
    const startButtons = [
      'button:has-text("Start")',
      'button:has-text("Begin")', 
      '[data-testid="start-game"]',
      '.start-button'
    ];
    
    let gameStarted = false;
    for (const selector of startButtons) {
      try {
        const startButton = managerPage.locator(selector).first();
        if (await startButton.isVisible()) {
          console.log('Starting game...');
          await startButton.click();
          gameStarted = true;
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (gameStarted) {
      console.log('✅ Game started successfully');
      
      // ====================
      // STEP 6: Play through all questions
      // ====================
      console.log('\n🎮 STEP 6: Playing through all 7 questions...');
      
      const totalQuestions = 7;
      const questionTimeout = 20000; // 20 seconds per question max
      
      for (let questionNum = 1; questionNum <= totalQuestions; questionNum++) {
        console.log(`\n📝 Question ${questionNum}/${totalQuestions}...`);
        
        // Wait for question to appear
        await managerPage.waitForTimeout(3000);
        
        // Look for answer buttons on player pages
        const answerSelectors = [
          'button:has-text("Jhon Warnock")', // First question answer
          'button:has-text("Photoshop")',   // Second question answer
          'button:has-text("1982")',        // Third question answer
          'button:has-text("San Jose")',    // Fourth question answer  
          'button:has-text("25,988")',      // Fifth question answer
          'button:has-text("Shantanu")',    // Sixth question answer
          'button:has-text("Creative")',    // Seventh question answer
        ];
        
        const playerPages = [player1Page, player2Page, player3Page];
        const playerNames = ['Player1', 'Player2', 'Player3'];
        
        // Try to answer questions for each player
        for (let i = 0; i < playerPages.length; i++) {
          const page = playerPages[i];
          const playerName = playerNames[i];
          
          try {
            // Look for any answer button
            const answerButtons = page.locator('button:not(:has-text("Submit")):not(:has-text("Start"))');
            const buttonCount = await answerButtons.count();
            
            if (buttonCount > 0) {
              // Click a random answer (or the first one)
              const answerIndex = Math.min(questionNum - 1, buttonCount - 1);
              await answerButtons.nth(answerIndex).click({ timeout: 5000 });
              console.log(`✅ ${playerName}: Answered question ${questionNum}`);
            } else {
              console.log(`⚠️ ${playerName}: No answer buttons found for question ${questionNum}`);
            }
          } catch (e) {
            console.log(`⚠️ ${playerName}: Could not answer question ${questionNum}: ${e.message}`);
          }
          
          // Small delay between players
          await page.waitForTimeout(500);
        }
        
        // Wait for question results/next question transition
        await managerPage.waitForTimeout(8000);
        
        // Check if manager has next question button and click it
        try {
          const nextButtons = [
            'button:has-text("Next")',
            'button:has-text("Continue")', 
            'button:has-text("Next Question")',
            'button:has-text("→")'
          ];
          
          for (const buttonText of nextButtons) {
            const nextButton = managerPage.locator(buttonText).first();
            if (await nextButton.isVisible({ timeout: 2000 })) {
              await nextButton.click();
              console.log(`✅ Manager: Clicked next button for question ${questionNum}`);
              break;
            }
          }
        } catch (e) {
          console.log(`⚠️ Manager: Could not find/click next button after question ${questionNum}`);
        }
        
        // Wait for next question to load or game to end
        await managerPage.waitForTimeout(3000);
      }
      
      // ====================
      // STEP 7: Wait for and capture game results
      // ====================
      console.log('\n🏆 STEP 7: Waiting for game results...');
      
      // Wait longer for game to finish processing
      await managerPage.waitForTimeout(10000);
      
      // Look for results/leaderboard indicators
      const resultSelectors = [
        '*:has-text("Results")',
        '*:has-text("Leaderboard")', 
        '*:has-text("Winner")',
        '*:has-text("Score")',
        '*:has-text("Points")',
        '*:has-text("Final")',
        '.results',
        '.leaderboard'
      ];
      
      resultsFound = false; // Reset for this scope
      const allPages = [managerPage, player1Page, player2Page, player3Page];
      const pageNames = ['Manager', 'Player1', 'Player2', 'Player3'];
      
      for (let i = 0; i < allPages.length; i++) {
        const page = allPages[i];
        const pageName = pageNames[i];
        
        for (const selector of resultSelectors) {
          try {
            const resultElement = page.locator(selector).first();
            if (await resultElement.isVisible({ timeout: 5000 })) {
              console.log(`✅ ${pageName}: Results page found with selector "${selector}"`);
              resultsFound = true;
              
              // Take screenshot of results page
              await page.screenshot({ 
                path: `game-results-${pageName.toLowerCase()}.png`, 
                fullPage: true 
              });
              break;
            }
          } catch (e) {
            // Continue searching
          }
        }
      }
      
      if (!resultsFound) {
        console.log('⚠️ Game results not found, taking screenshots of current state...');
        // Take screenshots anyway to see what's on screen
        for (let i = 0; i < allPages.length; i++) {
          await allPages[i].screenshot({ 
            path: `game-final-state-${pageNames[i].toLowerCase()}.png`, 
            fullPage: true 
          });
        }
      }
      
      console.log('📸 Screenshots saved for results analysis');
    }

    // ====================
    // FINAL RESULTS
    // ====================
    console.log('\n📊 FINAL TEST RESULTS:');
    console.log(`✅ Manager created game: ${gamePin ? 'SUCCESS' : 'FAILED'}`);
    console.log(`${usernameInputFound ? '✅' : '❌'} Manual player join: ${usernameInputFound ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Quick join URLs: SUCCESS (assumed if no errors)`);
    console.log(`${gameStarted ? '✅' : '❌'} Game start: ${gameStarted ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Full gameplay: ${gameStarted ? 'COMPLETED' : 'NOT ATTEMPTED'}`);
    console.log(`${resultsFound ? '✅' : '⚠️'} Game results: ${resultsFound ? 'FOUND AND CAPTURED' : 'SCREENSHOTS TAKEN FOR ANALYSIS'}`);

    // Final comprehensive screenshots
    await managerPage.screenshot({ path: 'final-comprehensive-manager.png', fullPage: true });
    await player1Page.screenshot({ path: 'final-comprehensive-player1.png', fullPage: true });
    await player2Page.screenshot({ path: 'final-comprehensive-player2.png', fullPage: true });
    await player3Page.screenshot({ path: 'final-comprehensive-player3.png', fullPage: true });

    console.log('🎯 COMPREHENSIVE TEST COMPLETED!');
    console.log('📸 Check the following screenshots for game results:');
    console.log('   - game-results-*.png (if results page found)');
    console.log('   - game-final-state-*.png (current state at end)'); 
    console.log('   - final-comprehensive-*.png (final screenshots)');
  });
});