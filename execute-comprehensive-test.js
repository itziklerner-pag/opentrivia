#!/usr/bin/env node

/**
 * Execute the comprehensive 3-player trivia test
 * This wrapper ensures proper execution and monitoring
 */

const { spawn } = require('child_process');
const http = require('http');

async function checkServerStatus() {
    return new Promise((resolve, reject) => {
        console.log('🔍 Checking if server is running on localhost:3002...');
        
        const req = http.get('http://localhost:3002', (res) => {
            console.log('✅ Server is running and accessible');
            console.log('📊 Status Code:', res.statusCode);
            resolve(true);
        });
        
        req.on('error', (err) => {
            console.error('❌ Server is NOT accessible on localhost:3002');
            console.error('🚨 Error:', err.message);
            console.log('\n🔧 To start the server, run one of:');
            console.log('   npm run dev        (Next.js development server)');
            console.log('   npm run all-dev    (Next.js + Socket server)');
            console.log('   npm run socket     (Socket server only)');
            reject(false);
        });
        
        req.setTimeout(5000, () => {
            console.error('⏰ Server check timeout');
            req.destroy();
            reject(false);
        });
    });
}

async function executeTest() {
    try {
        // Check server first
        await checkServerStatus();
        
        console.log('\n🎯 STARTING COMPREHENSIVE 3-PLAYER TRIVIA EXPERIMENT');
        console.log('='*60);
        console.log('📅 Start Time:', new Date().toISOString());
        console.log('🎮 Test Scope: Full game progression to final results');
        console.log('👥 Players: 1 manual PIN + 2 quick join URLs');
        console.log('📚 Questions: All 7 questions to completion');
        console.log('📸 Screenshots: Complete documentation');
        console.log('');
        
        // Execute the comprehensive test
        const testProcess = spawn('node', ['complete-game-test-final.js'], {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        
        testProcess.on('close', (code) => {
            console.log('\n' + '='*60);
            console.log('🏁 COMPREHENSIVE TEST COMPLETED');
            console.log('📊 Exit Code:', code);
            console.log('⏰ End Time:', new Date().toISOString());
            
            if (code === 0) {
                console.log('🎉 SUCCESS! Check the following files:');
                console.log('   📸 FINAL-GAME-RESULTS.png (Primary results screenshot)');
                console.log('   📸 FINAL-GAME-RESULTS-MANAGER.png (Manager view)');  
                console.log('   📸 FINAL-GAME-RESULTS-PLAYER1.png (Player1 view)');
                console.log('   📸 FINAL-GAME-RESULTS-QUICKJOIN1.png (Player2 view)');
                console.log('   📸 FINAL-GAME-RESULTS-QUICKJOIN2.png (Player3 view)');
                console.log('   📄 GameReport.md (Comprehensive statistics)');
                console.log('   📸 All question screenshots (GAME-Q1-Q7-*.png)');
                console.log('');
                console.log('🏆 MISSION ACCOMPLISHED: Final results page reached with scores!');
            } else {
                console.log('❌ TEST FAILED - Check error screenshots and logs');
                console.log('🔍 Look for ERROR-*.png files for debugging');
            }
            
            process.exit(code);
        });
        
        testProcess.on('error', (error) => {
            console.error('❌ Failed to start test process:', error.message);
            process.exit(1);
        });
        
        // Handle process termination
        process.on('SIGINT', () => {
            console.log('\n🛑 Test interrupted by user');
            testProcess.kill('SIGINT');
        });
        
    } catch (error) {
        console.error('❌ Pre-test setup failed:', error);
        console.log('\n🔧 Please ensure:');
        console.log('   1. Server is running (npm run dev or npm run all-dev)');
        console.log('   2. All dependencies are installed (npm install)');
        console.log('   3. Port 3002 is available');
        process.exit(1);
    }
}

// Execute the test
executeTest();