const http = require('http');

console.log('🔍 Checking if server is running...');

const req = http.get('http://localhost:3002', (res) => {
    console.log('✅ Server is running on localhost:3002');
    console.log('📊 Status:', res.statusCode);
    console.log('🎯 Ready to run experiment');
    
    // Now run the actual experiment
    console.log('\n🚀 Starting comprehensive trivia experiment...\n');
    require('./complete-3player-final-results-test');
    
}).on('error', (err) => {
    console.error('❌ Server is NOT running on localhost:3002');
    console.error('🚨 Error:', err.message);
    console.log('\n🔧 To start the server, run:');
    console.log('   npm run dev  (for development)');
    console.log('   or');  
    console.log('   npm run all-dev  (with socket server)');
    process.exit(1);
});

req.setTimeout(5000, () => {
    console.error('⏰ Server check timeout');
    req.destroy();
    process.exit(1);
});