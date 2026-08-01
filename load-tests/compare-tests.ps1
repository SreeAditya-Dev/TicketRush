# TicketRush Load Test Comparison Script (Windows)
# Runs both baseline and optimized tests for comparison

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      🎫 TicketRush Load Test Comparison Suite 🎫         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if k6 is installed
$k6Installed = Get-Command k6 -ErrorAction SilentlyContinue
if (-not $k6Installed) {
    Write-Host "❌ k6 is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install k6:" -ForegroundColor Yellow
    Write-Host "  winget install k6 --source winget"
    Write-Host "  OR"
    Write-Host "  choco install k6"
    Write-Host ""
    exit 1
}

Write-Host "✅ k6 is installed" -ForegroundColor Green
Write-Host ""

# Check if backend is running
Write-Host "🔍 Checking if backend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/availability?eventId=event-1&date=Fri%2C%2006%20Jun&time=04%3A30%20PM" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend is not responding!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start the backend:" -ForegroundColor Yellow
    Write-Host "  docker-compose up -d"
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test 1: Baseline Test (Original k6-quick-test.js)" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "⏱️  Duration: ~70 seconds"
Write-Host "👥 Max Users: 200"
Write-Host ""
Write-Host "Press Enter to start baseline test..." -ForegroundColor Yellow
Read-Host

Write-Host "🚀 Running baseline test..." -ForegroundColor Cyan
k6 run load-tests/k6-quick-test.js | Tee-Object -FilePath baseline-results.txt

Write-Host ""
Write-Host "✅ Baseline test complete! Results saved to baseline-results.txt" -ForegroundColor Green
Write-Host ""
Write-Host "⏳ Waiting 10 seconds before next test..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test 2: Optimized Test (k6-optimized.js)" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "⏱️  Duration: ~55 seconds"
Write-Host "👥 Max Users: 120"
Write-Host "🎯 Features: Smart seat selection + Early exit + Availability check"
Write-Host ""
Write-Host "Press Enter to start optimized test..." -ForegroundColor Yellow
Read-Host

Write-Host "🚀 Running optimized test..." -ForegroundColor Cyan
k6 run load-tests/k6-optimized.js | Tee-Object -FilePath optimized-results.txt

Write-Host ""
Write-Host "✅ Optimized test complete! Results saved to optimized-results.txt" -ForegroundColor Green
Write-Host ""

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                  📊 Comparison Summary                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Results saved to:" -ForegroundColor Green
Write-Host "  📄 baseline-results.txt"
Write-Host "  📄 optimized-results.txt"
Write-Host ""
Write-Host "Key metrics to compare:" -ForegroundColor Yellow
Write-Host "  ✅ Success Rate (should be 2-3x higher)" -ForegroundColor White
Write-Host "  📉 Total Requests (should be 40-60% lower)" -ForegroundColor White
Write-Host "  ⚡ Response Times (should be 30-40% faster)" -ForegroundColor White
Write-Host "  🎯 Successful Bookings (should be ~100 in both)" -ForegroundColor White
Write-Host ""
Write-Host "View detailed comparison in Grafana:" -ForegroundColor Yellow
Write-Host "  🔗 http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Comparison complete!" -ForegroundColor Green
