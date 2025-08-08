#!/bin/bash

echo "🎯 STARTING COMPREHENSIVE 3-PLAYER TRIVIA EXPERIMENT"
echo "📅 Date: $(date)"
echo "🌐 Server: localhost:3002"
echo ""

# Check if server is running
if ! curl -s http://localhost:3002 > /dev/null; then
    echo "❌ Server is not running on localhost:3002"
    echo "🚀 Please start the server first with: npm run dev"
    exit 1
fi

echo "✅ Server is running"
echo "🎮 Executing comprehensive test..."
echo ""

# Run the comprehensive test
node complete-3player-final-results-test.js

echo ""
echo "📊 Test execution completed"
echo "📸 Check the generated screenshots and report"
echo "🎯 Key file: FINAL-GAME-RESULTS.png"