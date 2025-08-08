#!/usr/bin/env node

// Direct execution wrapper for the comprehensive test
const { runComprehensive3PlayerTest } = require('./complete-3player-final-results-test');

console.log('🎯 EXECUTING COMPREHENSIVE 3-PLAYER TRIVIA EXPERIMENT');
console.log('📅 Started:', new Date().toISOString());
console.log('🌐 Server: localhost:3002');
console.log('');

async function main() {
    try {
        // Check server availability first
        const https = require('https');
        const http = require('http');
        
        await new Promise((resolve, reject) => {
            const req = http.get('http://localhost:3002', (res) => {
                console.log('✅ Server is running and accessible');
                resolve();
            });
            req.on('error', (err) => {
                console.error('❌ Server is not running on localhost:3002');
                console.error('🚀 Please start the server first with: npm run dev or npm run all-dev');
                reject(err);
            });
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Server check timeout'));
            });
        });

        console.log('🎮 Starting comprehensive trivia experiment...\n');
        
        const results = await runComprehensive3PlayerTest();
        
        console.log('\n🎉 EXPERIMENT COMPLETED!');
        console.log('📊 Results:', results.success ? 'SUCCESS' : 'FAILED');
        console.log('📸 Screenshots taken:', results.screenshots.length);
        console.log('🔄 State transitions:', results.stateTransitions.length);
        
        if (results.finalScores) {
            console.log('🏆 Final scores captured:', results.finalScores);
        }
        
        console.log('\n📋 Check these files:');
        console.log('   📸 FINAL-GAME-RESULTS.png (critical screenshot)');
        console.log('   📄 COMPREHENSIVE-EXPERIMENT-REPORT.md (full report)');
        
        process.exit(results.success ? 0 : 1);
        
    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

main();