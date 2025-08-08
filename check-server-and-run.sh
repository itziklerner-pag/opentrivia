#!/bin/bash

echo "🔍 Checking server status..."

# Check if server is running
if curl -s http://localhost:3002 > /dev/null 2>&1; then
    echo "✅ Server is running on localhost:3002"
    echo ""
    echo "🎯 EXECUTING COMPREHENSIVE 3-PLAYER TRIVIA EXPERIMENT"
    echo "📋 Mission: Reach ACTUAL final results page with scores"
    echo "⏰ Started: $(date)"
    echo ""
    
    # Run the experiment
    node run-final-experiment.js
    
    exit_code=$?
    echo ""
    echo "🏁 Experiment completed with exit code: $exit_code"
    
    if [ $exit_code -eq 0 ]; then
        echo "🎉 SUCCESS! Check these files:"
        echo "   📸 FINAL-GAME-RESULTS.png"
        echo "   📄 FINAL-EXPERIMENT-REPORT.md"
        echo "   📸 All other screenshots"
    else
        echo "❌ FAILED - Check error screenshots and logs"
    fi
    
    exit $exit_code
else
    echo "❌ Server is NOT running on localhost:3002"
    echo ""
    echo "🔧 Please start the server first:"
    echo "   npm run dev        (Next.js only)"
    echo "   npm run all-dev    (Next.js + Socket)"
    echo ""
    echo "Then run this script again:"
    echo "   bash check-server-and-run.sh"
    echo ""
    exit 1
fi