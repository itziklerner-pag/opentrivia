const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const MANAGER_PASSWORD = 'PASSWORD';

test.describe('Debug Channel Events', () => {
  test('Debug Pusher channel and event flow', async ({ browser }) => {
    const context = await browser.newContext();
    const playerPage = await context.newPage();

    // Enable detailed console logging with timestamps
    playerPage.on('console', msg => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [PLAYER] ${msg.text()}`);
    });

    console.log('🔍 Starting channel and event debugging...');

    // Navigate to player page
    await playerPage.goto(BASE_URL);
    console.log('📄 Player page loaded');

    // Wait for Pusher to connect
    await playerPage.waitForFunction(() => {
      return window.console.logs && window.console.logs.some(log => log.includes('Pusher connected'))
    }, { timeout: 10000 }).catch(() => {
      console.log('Pusher connection timeout - this is expected, continuing...')
    });

    // Inject debugging code to monitor Pusher events
    await playerPage.evaluate(() => {
      // Store original console.log
      const originalLog = console.log;
      window.console.logs = [];
      
      // Override console.log to capture all logs
      console.log = function(...args) {
        const message = args.join(' ');
        window.console.logs.push(message);
        originalLog.apply(console, args);
      };
      
      // Add global event listener for all Pusher events
      window.addEventListener('pusher-event', (e) => {
        console.log('🎯 GLOBAL PUSHER EVENT:', e.detail);
      });
    });

    // Find PIN input and enter a test PIN
    await playerPage.waitForSelector('input[placeholder*="PIN"], input[placeholder*="pin"]', { timeout: 10000 });
    console.log('✅ PIN input found');
    
    // Use a known invalid PIN first to test error handling
    await playerPage.fill('input[placeholder*="PIN"], input[placeholder*="pin"]', 'TESTXX');
    console.log('🚀 Submitting invalid PIN: TESTXX');
    
    await playerPage.click('button:has-text("Submit")');
    
    // Wait a moment and check for error
    await playerPage.waitForTimeout(3000);
    
    const logs = await playerPage.evaluate(() => window.console.logs);
    console.log('📋 All captured logs:');
    logs.forEach(log => console.log(`   ${log}`));
    
    // Check current page state
    const bodyText = await playerPage.locator('body').textContent();
    console.log(`📄 Current page text: ${bodyText.substring(0, 200)}...`);
    
    // Check what channels are subscribed
    const channelInfo = await playerPage.evaluate(() => {
      // Try to access Pusher instance if available
      if (typeof window.pusher !== 'undefined') {
        return {
          connection: window.pusher.connection.state,
          channels: Object.keys(window.pusher.channels.channels || {})
        };
      }
      return { error: 'Pusher not accessible from window' };
    });
    console.log('🔌 Pusher channels info:', JSON.stringify(channelInfo, null, 2));

    await context.close();
  });
});