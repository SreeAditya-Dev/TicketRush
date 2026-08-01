# TicketRush - All Optimization Levels Comparison
# Compares: Baseline → Basic → Ultra-Optimized

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🎫 TicketRush Full Optimization Comparison Suite 🎫    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check k6
$k6Installed = Get-Command k6 -ErrorAction SilentlyContinue
if (-not $k6Installed) {
    Write-Host "❌ k6 is not installed! Please install it first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ k6 is installed" -ForegroundColor Green
Write-Host ""

# Check backend
Write-Host "🔍 Checking backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/availability?eventId=event-1&date=Fri%2C%2006%20Jun&time=04%3A30%20PM" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend not responding! Run: docker-compose up -d" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "This test will run 3 optimization levels:" -ForegroundColor Cyan
Write-Host "  1️⃣  Baseline (stress.js)" -ForegroundColor White
Write-Host "  2️⃣  Basic Optimization (k6-optimized.js)" -ForegroundColor White
Write-Host "  3️⃣  Ultra-Optimization (k6-ultra-optimized.js)" -ForegroundColor White
Write-Host ""
Write-Host "⏱️  Total time: ~3-4 minutes" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to start comparison"

# Create results directory
$resultsDir = "comparison-results"
if (-not (Test-Path $resultsDir)) {
    New-Item -ItemType Directory -Path $resultsDir | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

# Test 1: Baseline
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test 1/3: Baseline (Original Stress Test)" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Strategy: Random seat selection, no optimization" -ForegroundColor Gray
Write-Host "Expected: ~5% success rate" -ForegroundColor Gray
Write-Host ""

k6 run load-tests/stress.js | Tee-Object -FilePath "$resultsDir/1-baseline-$timestamp.txt"

Write-Host ""
Write-Host "✅ Test 1 complete!" -ForegroundColor Green
Write-Host "⏳ Waiting 10 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test 2: Basic Optimization
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test 2/3: Basic Optimization" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Features: Smart seat selection + Early exit + Availability check" -ForegroundColor Gray
Write-Host "Expected: ~12-15% success rate" -ForegroundColor Gray
Write-Host ""

k6 run load-tests/k6-optimized.js | Tee-Object -FilePath "$resultsDir/2-optimized-$timestamp.txt"

Write-Host ""
Write-Host "✅ Test 2 complete!" -ForegroundColor Green
Write-Host "⏳ Waiting 10 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test 3: Ultra-Optimization
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test 3/3: Ultra-Optimization" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Features: Retry logic + Seat validation + Cache + Smart pool" -ForegroundColor Gray
Write-Host "Expected: ~20-25% success rate 🚀" -ForegroundColor Gray
Write-Host ""

k6 run load-tests/k6-ultra-optimized.js | Tee-Object -FilePath "$resultsDir/3-ultra-$timestamp.txt"

Write-Host ""
Write-Host "✅ Test 3 complete!" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    📊 Comparison Complete!                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Results saved to:" -ForegroundColor Green
Write-Host "  📄 $resultsDir/1-baseline-$timestamp.txt" -ForegroundColor White
Write-Host "  📄 $resultsDir/2-optimized-$timestamp.txt" -ForegroundColor White
Write-Host "  📄 $resultsDir/3-ultra-$timestamp.txt" -ForegroundColor White
Write-Host ""

Write-Host "Expected Progression:" -ForegroundColor Yellow
Write-Host "  1️⃣  Baseline:        ~5% success rate" -ForegroundColor White
Write-Host "  2️⃣  Optimized:       ~12-15% success rate (3x improvement)" -ForegroundColor White
Write-Host "  3️⃣  Ultra-Optimized: ~20-25% success rate (5x improvement)" -ForegroundColor White
Write-Host ""

Write-Host "Key Improvements to Look For:" -ForegroundColor Yellow
Write-Host "  ✅ Success rate increasing 3-5x" -ForegroundColor White
Write-Host "  ✅ Total requests decreasing 60-75%" -ForegroundColor White
Write-Host "  ✅ Response times decreasing 30-40%" -ForegroundColor White
Write-Host "  ✅ Retry attempts in ultra-optimized test" -ForegroundColor White
Write-Host "  ✅ Early exits in optimized tests" -ForegroundColor White
Write-Host ""

Write-Host "View detailed metrics in Grafana:" -ForegroundColor Yellow
Write-Host "  🔗 http://localhost:3001 (admin/admin)" -ForegroundColor Cyan
Write-Host ""

Write-Host "🎉 All tests complete!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tip: Review the saved results files to compare metrics side-by-side" -ForegroundColor Gray
