const http = require('http');
const { spawn } = require('child_process');

console.log('🔍 Checking server status...');

// Check if server is running
const req = http.get('http://localhost:3002', (res) => {
    console.log('✅ Server is running on localhost:3002');
    console.log('🎯 Starting trivia experiment...\n');
    
    // Run the experiment
    const experiment = spawn('node', ['run-trivia-experiment.js'], { stdio: 'inherit' });
    
    experiment.on('close', (code) => {
        console.log(`\n🏁 Experiment finished with code ${code}`);
        process.exit(code);
    });
    
}).on('error', (err) => {
    console.error('❌ Server is NOT running on localhost:3002');
    console.error('🔧 Please start the server with:');
    console.error('   npm run dev  (Next.js only)');
    console.error('   npm run all-dev  (Next.js + Socket server)');
    console.error('\nError details:', err.message);
    process.exit(1);
});

req.setTimeout(3000, () => {
    console.error('⏰ Server check timeout - server may not be running');
    req.destroy();
    process.exit(1);
});