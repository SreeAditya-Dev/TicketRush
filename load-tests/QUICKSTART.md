# 🚀 Quick Start - k6 Load Testing

## Step 1: Install k6

### Option A: Automated Installation (Windows)
```powershell
# Run this in PowerShell (as Administrator)
.\load-tests\install-k6.ps1
```

### Option B: Manual Installation

**Windows (winget):**
```bash
winget install k6 --source winget
```

**Windows (Chocolatey):**
```bash
choco install k6
```

**Using Docker (no installation needed):**
```bash
docker pull grafana/k6:latest
```

---

## Step 2: Ensure Backend is Running

```bash
# Start all services
docker-compose up -d

# Verify backend is accessible
curl http://localhost:4000/api/v1/events
```

---

## Step 3: Run Your First Test

### Quick Test (70 seconds)
```bash
k6 run load-tests/k6-quick-test.js
```

**Or with Docker:**
```bash
docker run --rm -i --network=host grafana/k6 run - < load-tests/k6-quick-test.js
```

### Flash Sale Simulation (90 seconds)
```bash
k6 run load-tests/k6-flash-sale.js
```

### Original Stress Test
```bash
k6 run load-tests/stress.js
```

---

## Step 4: Monitor Results

### Terminal Output
You'll see real-time metrics like:
```
✅ Successful Bookings: 98
❌ Failed Bookings: 1,847
📈 Success Rate: 5.04%
⏱️  Avg Response Time: 347ms
⚡ P95 Response Time: 892ms
```

### Grafana Dashboard
Open http://localhost:3001 (admin/admin) to see:
- `booking_attempts_total` - Spike during test
- `booking_success_total` - Should plateau at 100
- `db_query_duration_seconds` - Performance metrics

### Prometheus
Open http://localhost:9090 to query:
```
rate(booking_attempts_total[1m])
booking_success_total
```

---

## What Success Looks Like

✅ **Exactly 100 successful bookings** (no overselling)  
✅ **P95 response time < 1000ms** (fast under load)  
✅ **No database errors** (ACID compliance)  
✅ **5-15% success rate** (realistic for flash sale)

---

## Troubleshooting

### k6 command not found after installation
**Solution:** Restart your terminal/PowerShell

### Connection refused
**Solution:** Ensure backend is running:
```bash
docker-compose ps
docker-compose logs backend
```

### All requests failing
**Solution:** Reset and seed database:
```bash
cd backend
npm run reset
npm run seed
```

---

## Next Steps

1. ✅ Run `k6-quick-test.js` to validate setup
2. ✅ Run `k6-flash-sale.js` for comprehensive testing
3. ✅ Monitor Grafana dashboard during tests
4. ✅ Experiment with custom parameters:
   ```bash
   k6 run --vus 500 --duration 60s load-tests/k6-quick-test.js
   ```

---

## 📚 Full Documentation

See `load-tests/README.md` for complete guide with:
- Advanced scenarios
- Custom configurations
- Performance benchmarks
- Architecture explanations

---

**Ready? Start testing:**
```bash
k6 run load-tests/k6-quick-test.js
```

Then open Grafana: http://localhost:3001 🎉
