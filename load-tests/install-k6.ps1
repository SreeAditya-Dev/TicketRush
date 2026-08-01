# TicketRush k6 Installation Script for Windows
# This script installs k6 using winget or chocolatey

Write-Host "🎫 TicketRush - k6 Load Testing Tool Installation" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check if k6 is already installed
$k6Installed = Get-Command k6 -ErrorAction SilentlyContinue
if ($k6Installed) {
    Write-Host "✅ k6 is already installed!" -ForegroundColor Green
    k6 version
    exit 0
}

Write-Host "📦 Installing k6..." -ForegroundColor Yellow
Write-Host ""

# Try winget first (Windows 10/11)
$wingetAvailable = Get-Command winget -ErrorAction SilentlyContinue
if ($wingetAvailable) {
    Write-Host "Installing k6 via winget..." -ForegroundColor Cyan
    winget install k6 --source winget -e
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ k6 installed successfully via winget!" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  Please restart your terminal/PowerShell window" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Then run: k6 version" -ForegroundColor Cyan
        exit 0
    }
}

# Try chocolatey as fallback
$chocoAvailable = Get-Command choco -ErrorAction SilentlyContinue
if ($chocoAvailable) {
    Write-Host "Installing k6 via Chocolatey..." -ForegroundColor Cyan
    choco install k6 -y
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ k6 installed successfully via Chocolatey!" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  Please restart your terminal/PowerShell window" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Then run: k6 version" -ForegroundColor Cyan
        exit 0
    }
}

# Manual installation instructions
Write-Host ""
Write-Host "❌ Neither winget nor chocolatey is available." -ForegroundColor Red
Write-Host ""
Write-Host "Please install k6 manually using one of these methods:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Method 1 - Download Installer:" -ForegroundColor Cyan
Write-Host "  1. Visit: https://k6.io/docs/get-started/installation/" -ForegroundColor White
Write-Host "  2. Download the Windows installer" -ForegroundColor White
Write-Host "  3. Run the installer" -ForegroundColor White
Write-Host ""
Write-Host "Method 2 - Install winget (recommended):" -ForegroundColor Cyan
Write-Host "  1. Open Microsoft Store" -ForegroundColor White
Write-Host "  2. Search for 'App Installer'" -ForegroundColor White
Write-Host "  3. Install/Update it" -ForegroundColor White
Write-Host "  4. Run this script again" -ForegroundColor White
Write-Host ""
Write-Host "Method 3 - Use Docker:" -ForegroundColor Cyan
Write-Host "  docker pull grafana/k6:latest" -ForegroundColor White
Write-Host "  docker run --rm -i --network=host grafana/k6 run - < load-tests/k6-quick-test.js" -ForegroundColor White
Write-Host ""

exit 1
