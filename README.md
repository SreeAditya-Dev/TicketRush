# TicketRush – High-Volume Event Booking System

A full-stack demo showcasing **concurrency control**, **caching**, and **observability** for a high-traffic ticket flash sale scenario.

---

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React + TypeScript + Tailwind     |
| Backend     | Node.js + Express + TypeScript    |
| ORM         | Prisma                            |
| Database    | PostgreSQL                        |
| Cache/Lock  | Redis                             |
| Metrics     | Prometheus + prom-client          |
| Dashboards  | Grafana                           |
| Container   | Docker + docker-compose           |
| Load Test   | k6                                |

---

## Quick Start (Docker)

```bash
# 1. Spin up all services
docker-compose up --build -d

# 2. Apply database migrations + seed 100 seats
docker exec -it ticketrush-backend-1 sh -c "npx prisma migrate deploy && npm run seed"
```

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:4000/api/v1
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (login: `admin` / `admin`)

---

## API Endpoints

| Method | Endpoint                | Description                              |
|--------|-------------------------|------------------------------------------|
| GET    | /api/v1/health          | Health check                             |
| GET    | /api/v1/seats           | List all seats                           |
| POST   | /api/v1/book-seat       | Book a seat (JSON body below)            |
| GET    | /metrics                | Prometheus metrics                       |

### `POST /api/v1/book-seat`

```json
{
  "seatCode": "S001",
  "userId": "user-123",
  "strategy": "locked"
}
```

- `strategy`: `"locked"` (safe) or `"naive"` (race-condition demo).

---

## Running Locally (without Docker)

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- pnpm / npm

### Backend

```bash
cd backend
cp .env.example .env   # edit with local Postgres / Redis URLs
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev            # starts on :4000
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # starts on :5173 (proxies /api to :4000)
```

---

## Load Testing with k6

```bash
# Reset seats first (optional)
curl -X DELETE http://localhost:4000/api/v1/reset   # (implement if needed)

# Run stress test
k6 run -e API_URL=http://localhost:4000 -e STRATEGY=locked load-tests/stress.js
```

Try `STRATEGY=naive` to see race-condition overselling in action.

---

## Monitoring

1. Open **Grafana** at http://localhost:3001
2. Navigate to the pre-provisioned **TicketRush Metrics** dashboard
3. Visualize:
   - Booking attempts / success / blocked rates
   - DB query latency (p50, p95, p99)

---

## Project Structure

```
TicketRush/
├── backend/
│   ├── prisma/             # Prisma schema + migrations
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── config.ts
│   │   ├── metrics.ts      # prom-client custom metrics
│   │   ├── redis.ts        # Redis locking helpers
│   │   └── index.ts        # Express entry point
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Seat map + booking UI
│   │   └── api.ts          # API helpers
│   └── Dockerfile
├── grafana/
│   ├── dashboards/         # Pre-built dashboard JSON
│   └── provisioning/       # Datasource + dashboard config
├── prometheus/
│   └── prometheus.yml
├── load-tests/
│   └── stress.js           # k6 script
└── docker-compose.yml
```

---

## Key Concepts Demonstrated

1. **Race Condition Demo** – Use the `naive` strategy to see overselling.
2. **Distributed Lock (Redis)** – `SET NX EX` pattern prevents concurrent writes.
3. **Serializable Transactions** – Prisma + Postgres ensures consistency.
4. **Observability** – Prometheus metrics + Grafana dashboards.

---

## License

MIT
