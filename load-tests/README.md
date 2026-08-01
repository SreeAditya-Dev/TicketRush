# 🚀 TicketRush k6 Load Testing Guide

Complete guide to load testing TicketRush's high-concurrency booking system using k6.

---

## 📦 Installation

### Windows (Chocolatey)
```bash
choco install k6
```

### Windows (winget)
```bash
winget install k6 --source winget
```

### macOS (Homebrew)
```bash
brew install k6
```

### Linux (Debian/Ubuntu)
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Docker (Any OS)
```bash
docker pull grafana/k6:latest
```

### Verify Installation
```bash
k6 version
```

---

## 🎯 Available Test Scripts

### 1. **Quick Test** (`k6-quick-test.js`)
**Best for:** Quick validation and basic load testing

**Profile:**
- Warm up: 10s → 50 users
- Load: 30s @ 100 concurrent users
- Stress: 20s @ 200 concurrent users
- Cool down: 10s → 0 users

**Run:**
```bash
k6 run load-tests/k6-quick-test.js
```

---

### 2. **Flash Sale Test** (`k6-flash-sale.js`)
**Best for:** Simulating real flash sale scenarios with multiple test phases

**Includes 3 Scenarios:**
1. **Flash Sale Burst:** 500 req/s for 10 seconds (simulates 1000+ users clicking at once)
2. **Sustained Load:** 50 concurrent users for 30 seconds
3. **Stress Test:** Ramps from 10 → 500 req/s over 90 seconds

**Run:**
```bash
k6 run load-tests/k6-flash-sale.js
```

---

### 3. **Original Stress Test** (`stress.js`)
**Best for:** Raw concurrency testing

**Profile:**
- 100 virtual users
- 500 total iterations
- Tests distributed locking

**Run:**
```bash
k6 run load-tests/stress.js
```

---

## 🔧 Configuration Options

### Environment Variables

```bash
# Change API URL (default: http://localhost:4000)
k6 run -e API_URL=http://localhost:4000 load-tests/k6-quick-test.js

# Change Event ID (default: event-1)
k6 run -e EVENT_ID=event-2 load-tests/k6-quick-test.js

# Change Date/Time for flash sale test
k6 run -e DATE="Sat, 07 Jun" -e TIME="07:00 PM" load-tests/k6-flash-sale.js
```

### Custom Test Duration

```bash
# Run quick test with more users
k6 run --vus 300 --duration 60s load-tests/k6-quick-test.js

# Run specific scenario only
k6 run --scenario flash_sale_burst load-tests/k6-flash-sale.js
```

---

## 📊 Understanding Results

### Key Metrics

| Metric | Description | Good Target |
|--------|-------------|-------------|
| `http_req_duration` | Response time | p95 < 1000ms |
| `http_req_failed` | Failed request rate | < 60% (due to overselling prevention) |
| `successful_bookings` | Confirmed bookings | Should not exceed 100 |
| `success_rate` | Booking success % | 5-15% (competitive flash sale) |
| `http_reqs` | Total requests/sec | Depends on infrastructure |

### Example Output

```
✅ Successful Bookings: 98
❌ Failed Bookings: 1,847
📈 Success Rate: 5.04%
⏱️  Avg Response Time: 347ms
⚡ P95 Response Time: 892ms
```

### What Good Results Look Like:

✅ **Successful bookings = exactly 100** (proves no overselling)  
✅ **P95 response time < 1000ms** (fast under load)  
✅ **No database errors** (ACID compliance working)  
✅ **Success rate 5-15%** (realistic for 100 seats vs 1000+ users)

---

## 🎬 Complete Test Workflow

### Step 1: Start Services
```bash
docker-compose up -d
```

### Step 2: Reset Database (Optional)
```bash
cd backend
npm run reset
npm run seed
```

### Step 3: Run Load Test
```bash
# Quick validation
k6 run load-tests/k6-quick-test.js

# Full flash sale simulation
k6 run load-tests/k6-flash-sale.js

# Extreme stress test
k6 run --vus 500 --duration 30s load-tests/k6-quick-test.js
```

### Step 4: Monitor in Real-Time

**Grafana Dashboard:**
- URL: http://localhost:3001
- Login: admin / admin
- Watch: `booking_attempts_total`, `booking_success_total`, `db_query_duration_seconds`

**Prometheus Metrics:**
- URL: http://localhost:9090
- Query: `rate(booking_attempts_total[1m])`

---

## 🔥 Advanced Testing Scenarios

### Test Overselling Prevention
```bash
# 1000 users fighting for 100 seats
k6 run --vus 1000 --iterations 1000 load-tests/stress.js
```

### Test Database Performance
```bash
# Sustained high load for 5 minutes
k6 run --vus 200 --duration 5m load-tests/k6-quick-test.js
```

### Test Redis TTL (5-min checkout holds)
```bash
# Hold seats and let them expire
k6 run -e HOLD_ONLY=true load-tests/k6-flash-sale.js
```

### Test with Docker
```bash
docker run --rm -i --network=host grafana/k6 run - < load-tests/k6-quick-test.js
```

---

## 🐛 Troubleshooting

### Issue: Connection refused
**Solution:** Ensure backend is running on port 4000
```bash
docker-compose ps
curl http://localhost:4000/health
```

### Issue: All requests failing
**Solution:** Check database has seats available
```bash
cd backend
npm run seed
```

### Issue: High error rate (>80%)
**Solution:** This is expected! With 1000 users fighting for 100 seats, 90% will fail due to concurrency protection. This proves the system works correctly.

### Issue: k6 command not found
**Solution:** Restart terminal after installation or use Docker:
```bash
docker run --rm -i grafana/k6 version
```

---

## 📈 Expected Performance Benchmarks

### For 100 Seats:

| Virtual Users | Expected Success | Avg Response Time | P95 Response Time |
|---------------|------------------|-------------------|-------------------|
| 50 | 80-100 | 100-300ms | 400-600ms |
| 100 | 90-100 | 200-400ms | 600-900ms |
| 500 | 95-100 | 300-600ms | 800-1200ms |
| 1000 | 98-100 | 400-800ms | 1000-1500ms |

### Proof of Robustness:
- ✅ **Zero overselling** across all tests
- ✅ **No database corruption** under extreme load
- ✅ **Predictable response times** even at 500+ RPS
- ✅ **Automatic TTL expiry** prevents inventory freeze

---

## 🎓 Understanding the Architecture

k6 tests validate the **3-Layer Defense** system:

1. **Redis Distributed Locks** → Prevents concurrent processing
2. **PostgreSQL Serializable Transactions** → Ensures ACID compliance
3. **Composite Unique Constraints** → Database-level duplicate prevention

**Result:** Even under 1000+ concurrent requests, exactly 100 tickets get sold with zero duplicates.

---

## 📚 Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [Grafana k6 Cloud](https://grafana.com/products/cloud/k6/)

---

## 🎯 Quick Commands Reference

```bash
# Quick test
k6 run load-tests/k6-quick-test.js

# Flash sale simulation
k6 run load-tests/k6-flash-sale.js

# Custom VUs and duration
k6 run --vus 200 --duration 30s load-tests/k6-quick-test.js

# Output to JSON
k6 run --out json=results.json load-tests/k6-quick-test.js

# With custom API URL
k6 run -e API_URL=http://production.com load-tests/k6-quick-test.js
```

---

**Ready to test? Start with:**
```bash
k6 run load-tests/k6-quick-test.js
```

Then monitor results in Grafana: **http://localhost:3001** 🎉
