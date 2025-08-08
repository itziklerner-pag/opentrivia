const http = require('http');

console.log('🔍 Testing server connection...');

const req = http.get('http://localhost:3002', (res) => {
    console.log('✅ Server is accessible!');
    console.log('📊 Status:', res.statusCode);
    console.log('🎯 Server is ready for trivia experiment');
    
    // Server is running, let's execute the experiment
    console.log('\n🚀 Launching comprehensive trivia experiment...');
    require('./run-final-experiment.js');
    
}).on('error', (err) => {
    console.error('❌ Server is NOT accessible on localhost:3002');
    console.error('🚨 Error:', err.message);
    console.log('');
    console.log('🔧 To start the server, run:');
    console.log('   npm run dev        (Next.js development server)');
    console.log('   npm run all-dev    (Next.js + Socket server)');
    console.log('');
    console.log('Then run this test again:');
    console.log('   node direct-test.js');
    
    process.exit(1);
});