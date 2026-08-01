#!/bin/bash

# TicketRush Load Test Comparison Script
# Runs both baseline and optimized tests for comparison

echo "╔════════════════════════════════════════════════════════════╗"
echo "║      🎫 TicketRush Load Test Comparison Suite 🎫         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "❌ k6 is not installed!"
    echo ""
    echo "Please install k6:"
    echo "  Windows: winget install k6 --source winget"
    echo "  macOS:   brew install k6"
    echo "  Docker:  docker pull grafana/k6:latest"
    echo ""
    exit 1
fi

echo "✅ k6 is installed"
echo ""

# Check if backend is running
echo "🔍 Checking if backend is running..."
if curl -s http://localhost:4000/api/v1/availability?eventId=event-1&date=Fri%2C%2006%20Jun&time=04%3A30%20PM > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not responding!"
    echo ""
    echo "Please start the backend:"
    echo "  docker-compose up -d"
    echo ""
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Test 1: Baseline Test (Original k6-quick-test.js)"
echo "════════════════════════════════════════════════════════════"
echo "⏱️  Duration: ~70 seconds"
echo "👥 Max Users: 200"
echo ""
read -p "Press Enter to start baseline test..."

k6 run load-tests/k6-quick-test.js 2>&1 | tee baseline-results.txt

echo ""
echo "✅ Baseline test complete! Results saved to baseline-results.txt"
echo ""
echo "⏳ Waiting 10 seconds before next test..."
sleep 10

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Test 2: Optimized Test (k6-optimized.js)"
echo "════════════════════════════════════════════════════════════"
echo "⏱️  Duration: ~55 seconds"
echo "👥 Max Users: 120"
echo "🎯 Features: Smart seat selection + Early exit + Availability check"
echo ""
read -p "Press Enter to start optimized test..."

k6 run load-tests/k6-optimized.js 2>&1 | tee optimized-results.txt

echo ""
echo "✅ Optimized test complete! Results saved to optimized-results.txt"
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  📊 Comparison Summary                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Results saved to:"
echo "  📄 baseline-results.txt"
echo "  📄 optimized-results.txt"
echo ""
echo "Key metrics to compare:"
echo "  ✅ Success Rate (should be 2-3x higher)"
echo "  📉 Total Requests (should be 40-60% lower)"
echo "  ⚡ Response Times (should be 30-40% faster)"
echo "  🎯 Successful Bookings (should be ~100 in both)"
echo ""
echo "View detailed comparison in Grafana:"
echo "  🔗 http://localhost:3001"
echo ""
echo "🎉 Comparison complete!"
