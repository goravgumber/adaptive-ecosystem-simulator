# Adaptive Ecosystem Simulator

![CI](https://github.com/Gauravg2630/adaptive-ecosystem-simulator/actions/workflows/ci.yml/badge.svg)

A full-stack ecosystem simulation platform for exploring plant, herbivore, and
carnivore population changes through live dashboards, persisted simulation
history, monitoring, alerts, reports, and ML-assisted predictions.

The project consists of a React dashboard, an Express API, a Python FastAPI ML
service, a dedicated simulation engine service, MongoDB persistence, Redis-backed
caching and job queues, and Socket.IO updates. It includes Docker, Nginx, systemd,
health checks, and CI assets for deployment-oriented development.

## Contents

- [What It Does](#what-it-does)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Repository Layout](#repository-layout)
- [Quick Start With Docker](#quick-start-with-docker)
- [Local Development Setup](#local-development-setup)
- [Environment Configuration](#environment-configuration)
- [Using The Application](#using-the-application)
- [API Overview](#api-overview)
- [Realtime Events And Background Jobs](#realtime-events-and-background-jobs)
- [ML Service](#ml-service)
- [Health Checks And Monitoring](#health-checks-and-monitoring)
- [Testing And Validation](#testing-and-validation)
- [Deployment Notes](#deployment-notes)
- [Current Implementation Notes](#current-implementation-notes)
- [Contributing](#contributing)
- [License](#license)

## What It Does

### Simulation and dashboard

- Runs a simple three-population simulation with plants, herbivores, and
  carnivores.
- Saves authenticated users' simulation snapshots in MongoDB.
- Displays current values, population trends, activity logs, and generated
  ecosystem insights.
- Provides settings for initial populations and simulation speed.

### Predictions and analysis

- Generates collapse-risk predictions from recent simulation history.
- Produces population forecasts and intervention recommendations.
- Analyzes patterns and exposes prediction history and statistics.
- Supports queued ML training and prediction-generation operations.

Predictions are model-assisted analysis for this simulator, not validated
scientific or environmental forecasts.

### Operations

- JWT authentication with access tokens, refresh-token rotation, logout, and
  logout-all session invalidation.
- Role-based administrative endpoints for users and BullMQ jobs.
- Redis-backed caching, rate limiting, token revocation, and job queues.
- System metrics, operational alerts, event tracking, and readiness/liveness
  probes.
- Authenticated Socket.IO connections for live updates.

### Frontend pages

After login, the web application provides:

- Dashboard
- Simulation
- Predictions
- Monitoring
- Alerts
- Reports with CSV export
- Logbook with JSON export
- Settings and dark mode

## Architecture

```text
Browser (React + Vite)
        |
        | HTTP /api/v1 and Socket.IO
        v
Node.js / Express API --------------- Redis
        |                             | cache, rate limit state,
        |                             | token revocation, BullMQ
        |                             v
        |                        Background worker (BullMQ)
        |
        +----------------------- MongoDB
        |                        users, snapshots, predictions,
        |                        events, metrics
        |
        +----------------------- Simulation Service (Node.js, port 3001)
        |                        Lotka-Volterra engine, POST /tick
        |
        +----------------------- Python FastAPI ML Service (port 8000)
                                 LSTM, Random Forest, ARIMA, LLM Insights
                                 APScheduler background retraining
```

In the container stack, Nginx provides a single public entry point and proxies
the frontend, API, health checks, and Socket.IO traffic. The simulation engine
has been extracted into a standalone microservice (`simulation-service`) running
Lotka-Volterra equations. The ML service uses FastAPI with scikit-learn and
TensorFlow LSTM models, with APScheduler-based background retraining.

## Technology Stack

| Area | Implementation |
| --- | --- |
| Frontend | React 19, Vite 7, React Router, Recharts, Tailwind CSS, Framer Motion, Socket.IO Client |
| Backend API | Node.js, Express 4, Mongoose, Socket.IO, Swagger UI, Bull Board |
| Authentication | JWT access/refresh tokens, bcryptjs, Redis token revocation |
| Security and HTTP | Helmet, CORS, rate limiting, mongo sanitization, XSS cleaning, compression |
| Data | MongoDB 6 container, Redis 7 container |
| Jobs | BullMQ worker using Redis |
| ML microservice | Python, FastAPI, TensorFlow LSTM, scikit-learn, statsmodels ARIMA, APScheduler |
| Simulation Engine | Dedicated Node.js microservice (Lotka-Volterra) |
| CI/CD | GitHub Actions (lint, test, docker build) |
| Deployment | Docker Compose, Nginx reverse proxy, systemd service, GitHub Actions |

## Repository Layout

```text
adaptive-ecosystem-simulator/
|-- backend/
|   |-- config/              # Validated Node environment and Redis connection
|   |-- controllers/         # Health, dashboard, monitoring, simulation logic
|   |-- docs/                # Swagger definition
|   |-- middleware/          # Auth, RBAC, validation, tracing, errors
|   |-- ml-service/          # Standalone Python Flask service
|   |-- models/              # Mongoose schemas
|   |-- queues/              # BullMQ queue setup
|   |-- repositories/        # Data-access helpers
|   |-- routes/              # HTTP API routes
|   |-- services/            # Auth, AI, prediction, event, report services
|   |-- sockets/             # Socket authentication
|   |-- tests/               # Node unit tests
|   |-- workers/             # BullMQ background worker
|   |-- .env.example         # Backend configuration template
|   `-- server.js            # Express and Socket.IO entry point
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- components/
|   |   |-- context/
|   |   |-- pages/
|   |   `-- services/
|   |-- Dockerfile
|   `-- vite.config.js
|-- deployment/
|   `-- ecosystem-backend.service
|-- docs/
|   |-- api.md
|   `-- backend-platform.md
|-- infra/nginx/nginx.conf
|-- scripts/healthcheck.sh
|-- docker-compose.yml
|-- docker-compose.dev.yml
`-- README.md
```

## Quick Start With Docker

The full Compose file describes MongoDB, Redis, the ML service, the backend,
the built frontend, and an Nginx reverse proxy.

### Requirements

- Git
- Docker Engine with the Docker Compose plugin

### Start the stack

```bash
git clone https://github.com/Gauravg2630/adaptive-ecosystem-simulator.git
cd adaptive-ecosystem-simulator
docker compose up --build -d
```

Expected endpoints:

| Service | URL |
| --- | --- |
| Application through Nginx | `http://localhost` |
| Static frontend container directly (no API proxy) | `http://localhost:8080` |
| Backend directly | `http://localhost:5000` |
| API documentation | `http://localhost:5000/api/docs` |
| Backend health | `http://localhost:5000/health` |
| ML health | `http://localhost:8000/health` |

Check services and backend health:

```bash
docker compose ps
./scripts/healthcheck.sh
```

Follow logs or stop the stack:

```bash
docker compose logs -f backend ml-service
docker compose down
```

Use `docker compose down -v` only when you intentionally want to delete the
MongoDB and Redis Docker volumes.

### Security before deployment

The checked-in Compose configuration contains a placeholder `JWT_SECRET` and
publishes database/cache ports for development visibility. Before exposing a
deployment publicly, provide a strong private JWT secret and restrict MongoDB
and Redis network exposure.

### Container compatibility note

The current frontend uses Vite 7, while `frontend/Dockerfile` presently starts
its build stage from Node 18. If the Docker frontend build reports an
unsupported Node engine, update that build image to a Vite-supported Node
release (Node 20.19+ or Node 22.12+) before building the full stack.

## Local Development Setup

Local development is the most direct way to run the current source with hot
reload. MongoDB and Redis can be installed locally or run as containers.

### Requirements

- Node.js `20.19+` or `22.12+` for the Vite 7 frontend
- npm
- Python `3.11+` with `venv`
- MongoDB and Redis, or Docker for those two services

### 1. Start MongoDB and Redis

To use containers only for infrastructure:

```bash
docker compose -f docker-compose.dev.yml up -d mongodb redis
```

This exposes MongoDB on `localhost:27017` and Redis on `localhost:6379`.

### 2. Configure and install the backend

```bash
cd backend
cp .env.example .env
npm ci
```

At minimum, replace `JWT_SECRET` in `backend/.env` with a private value of at
least 12 characters.

### 3. Install the Python ML service

The Node backend attempts to launch the local Python service when it starts.
Install its dependencies and point the backend at that virtual environment:

```bash
cd ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

Add this optional local override to `backend/.env`, using the absolute path on
your machine:

```env
PYTHON_EXECUTABLE=/absolute/path/to/adaptive-ecosystem-simulator/backend/ml-service/venv/bin/python
```

### 4. Run the backend

From `backend/`:

```bash
npm run dev
```

The API starts at `http://localhost:5000`. Under the standard local flow it
also starts the ML service on `http://localhost:8000`, so do not launch a
second local ML process on the same port.

### 5. Run the frontend

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests to the backend, and
the frontend connects to Socket.IO at `http://localhost:5000` during
development.

### Optional frontend environment

Create `frontend/.env.local` only if the API or Socket.IO server is hosted
elsewhere:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

## Environment Configuration

### Backend (`backend/.env`)

Start from `backend/.env.example`.

| Variable | Required | Default/example | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development`, `test`, or `production` |
| `PORT` | No | `5000` | Node API port |
| `MONGO_URI` | Yes | `mongodb://localhost:27017/ecosystem` | MongoDB connection URL |
| `JWT_SECRET` | Yes | Change the example | Signs access and refresh tokens; minimum 12 characters |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access-token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh-token lifetime |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | Cache, queues, rate limiting, and token state |
| `ML_SERVICE_URL` | Yes | `http://localhost:8000` | Flask prediction service base URL |
| `FRONTEND_URL` | Recommended in production | Example is commented | Allowed browser origin in production |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate-limit window in milliseconds |
| `RATE_LIMIT_MAX` | No | `100` | Maximum requests per window |
| `PYTHON_EXECUTABLE` | No | `python3` | Python used when backend starts the local ML service |
| `ML_SERVICE_STARTUP_TIMEOUT_MS` | No | `15000` | ML child startup timeout |
| `ML_SERVICE_STARTUP_RETRIES` | No | `3` | ML child startup attempts |
| `ML_SERVICE_RETRY_INTERVAL_MS` | No | `5000` | Delay between ML startup attempts |

### ML service

The ML service reads `backend/.env` and optionally
`backend/ml-service/ml-service.env`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `ML_SERVICE_PORT` | `8000` | Flask listening port |
| `ML_MODEL_DIR` | `backend/ml-service/models` | Persisted model directory |
| `COLLAPSE_MODEL_FILE` | `collapse_predictor.pkl` in model directory | Collapse model file |
| `POPULATION_MODEL_FILE` | `population_forecaster.pkl` in model directory | Forecast model file |
| `ML_LOG_DIR` | `backend/ml-service/logs` | ML log directory |
| `MIN_PREDICTION_DATA_POINTS` | `5` | ML endpoint minimum prediction data |
| `MIN_FORECAST_DATA_POINTS` | `20` | ML endpoint minimum forecast history |
| `MAX_FORECAST_STEPS` | `14` | ML forecast horizon limit |

The Node prediction layer applies its own history checks: collapse prediction
requires at least 10 saved simulation steps and population forecasting
requires at least 20.

### Frontend

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | Backend API prefix used by the browser |
| `VITE_SOCKET_URL` | Local backend in development; current origin in production | Socket.IO host |

## Using The Application

1. Open the frontend and create an account on the login screen. Usernames
   require at least 3 characters and passwords at least 8.
2. Sign in. The API issues an access token and rotating refresh token used by
   protected requests.
3. Open **Simulation**, choose starting populations or speed in **Settings**,
   and start generating snapshots.
4. Use **Dashboard**, **Monitoring**, **Alerts**, **Reports**, and **Logbook**
   to review persisted activity and exported data.
5. After enough snapshots exist, open **Predictions** to generate collapse
   risk, forecast, recommendation, and pattern analysis outputs.

The UI stores authentication tokens, theme choice, and simulation settings in
browser `localStorage`. Do not use shared browser profiles for sensitive
deployments.

## API Overview

The current API prefix is:

```text
http://localhost:5000/api/v1
```

Requests to the compatibility `/api/...` application prefix are handled
alongside their `/api/v1/...` equivalents. Swagger UI is available at
`/api/docs`.

Protected endpoints require:

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

### Authentication example

Create a user:

```bash
curl -X POST http://localhost:5000/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo_user","password":"change-me-now"}'
```

Log in:

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo_user","password":"change-me-now"}'
```

The login response includes `accessToken`, `refreshToken`, and the public user
record. Use the returned access token for protected routes:

```bash
curl http://localhost:5000/api/v1/simulation/status \
  -H 'Authorization: Bearer <access-token>'
```

### Endpoint summary

Authentication:

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/signup` | Public | Create a user |
| `POST` | `/api/v1/auth/register` | Public | Email-validated registration compatibility route |
| `POST` | `/api/v1/auth/login` | Public | Issue access and refresh tokens |
| `POST` | `/api/v1/auth/refresh` | Public | Rotate a refresh token |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revoke the current session |
| `POST` | `/api/v1/auth/logout-all` | Authenticated | Revoke all user sessions |
| `GET` | `/api/v1/auth/validate` | Authenticated | Validate access token |
| `GET` | `/api/v1/auth/me` | Authenticated | Return current profile |

Simulation and dashboard:

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/simulation` | Authenticated | Store a population snapshot |
| `GET` | `/api/v1/simulation` | Authenticated | Fetch latest saved snapshot |
| `DELETE` | `/api/v1/simulation/reset` | Authenticated | Remove user history and reset state |
| `DELETE` | `/api/v1/simulation/clear` | Authenticated | Clear user simulation history |
| `POST` | `/api/v1/simulation/toggle` | Authenticated | Pause or resume backend simulation state |
| `POST` | `/api/v1/simulation/speed` | Authenticated | Set tick speed; minimum `100` ms |
| `GET` | `/api/v1/simulation/status` | Authenticated | Read running/speed state |
| `GET` | `/api/v1/simulation/logs` | Authenticated | Last 50 stored snapshots |
| `GET` | `/api/v1/simulation/history` | Authenticated | History with `limit` and `sort` query options |
| `GET` | `/api/v1/simulation/insights` | Authenticated | Generate rule-based population insights |
| `GET` | `/api/v1/dashboard` | Authenticated | Latest population stats and trend |

Predictions:

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/predictions/collapse` | Authenticated | Generate collapse-risk result |
| `POST` | `/api/v1/predictions/forecast` | Authenticated | Generate population forecast |
| `POST` | `/api/v1/predictions/recommendations` | Authenticated | Generate suggested actions |
| `POST` | `/api/v1/predictions/patterns` | Authenticated | Analyze patterns |
| `GET` | `/api/v1/predictions` | Authenticated | List saved predictions |
| `GET` | `/api/v1/predictions/stats` | Authenticated | Prediction statistics |
| `GET` | `/api/v1/predictions/latest/:type` | Authenticated | Latest outputs by type |
| `PUT` | `/api/v1/predictions/:id/evaluate` | Authenticated | Record actual outcome/accuracy |
| `POST` | `/api/v1/predictions/train` | Admin | Queue model training |

Monitoring, reports, and events:

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/metrics` | Authenticated | Capture and return metrics |
| `GET` | `/api/v1/metrics/history` | Authenticated | Retrieve historical metrics |
| `GET` | `/api/v1/metrics/realtime` | Authenticated | Chart-oriented metrics data |
| `GET` | `/api/v1/alerts` | Authenticated | Alerts derived from latest simulation |
| `GET` | `/api/v1/alerts/history` | Authenticated | Historical simulation alerts |
| `POST` | `/api/v1/alerts/monitor` | Authenticated | Activate alert-monitoring response flow |
| `GET` | `/api/v1/events` | Authenticated | Query recorded events |
| `GET` | `/api/v1/events/stats` | Authenticated | Aggregated event statistics |
| `GET` | `/api/v1/events/critical` | Authenticated | Critical and unresolved events |
| `GET` | `/api/v1/events/category/:category` | Authenticated | Filter events by category |
| `GET` | `/api/v1/events/user/:userId` | Owner or admin | User event history |
| `POST` | `/api/v1/events` | Authenticated | Create an event |
| `PATCH` | `/api/v1/events/:id/resolve` | Authenticated | Resolve an event |
| `PATCH` | `/api/v1/events/:id/tags` | Authenticated | Add tags to an event |
| `DELETE` | `/api/v1/events/:id` | Admin | Delete an event |
| `GET` | `/api/v1/logs` | Authenticated | Recent application log records |
| `GET` | `/api/v1/reports/summary` | Public currently | Population summary report |
| `GET` | `/api/v1/monitor` | Public currently | Basic process/database status |

Administrative operations:

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/admin/overview` | Admin | User/simulation/event overview |
| `GET` | `/api/v1/admin/users` | Admin | Paginated users |
| `PATCH` | `/api/v1/admin/users/:userId/role` | Admin | Change a role |
| `GET` | `/api/v1/queues` | Admin | Queue counts |
| `GET` | `/api/v1/queues/:queueName/jobs` | Admin | Inspect jobs |
| `GET` | `/api/v1/queues/:queueName/jobs/:jobId` | Admin | Inspect one job |
| `POST` | `/api/v1/queues/:queueName/jobs` | Admin | Enqueue an allowed job |

Health endpoints are deliberately outside `/api/v1`:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health/live` | Backend process liveness |
| `GET` | `/health/ready` | MongoDB and Socket.IO readiness |
| `GET` | `/health` | Expanded health with ML status and metrics |

## Realtime Events And Background Jobs

### Socket.IO

Socket.IO connections must supply the JWT access token using
`auth: { token: "<access-token>" }`, the `token` query parameter, or a bearer
authorization header. The frontend uses the `auth` form.

The backend emits live events including:

- `connection-success`
- `simulation-update`, `simulation-reset`, `simulation-toggle`, and
  `simulation-speed-change`
- `ecosystem-alerts` and `simulation-insights`
- `prediction-update`
- `system-event`, `system-metrics`, and `critical-alerts`

### BullMQ jobs

Redis powers the `background-tasks` queue. The worker accepts these job names:

| Job | Purpose |
| --- | --- |
| `ml-training` | Build training input from stored simulation data and train the collapse model |
| `prediction-generation` | Run collapse or forecast predictions asynchronously |
| `alert-processing` | Store metrics and emit operational alerts |
| `report-generation` | Generate and cache report summary data |
| `event-cleanup` | Clean up expired metric/event records |

The backend enqueues alert processing at startup and every minute, and cleanup
every six hours. Queue management HTTP endpoints require an `admin` JWT role.

## ML Service

The Flask service can be addressed directly on port `8000`, although normal
web clients call prediction routes through the Node backend.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Report model/service health |
| `POST` | `/predict/collapse` | Run collapse-risk inference |
| `POST` | `/predict/populations` | Run population forecasting |
| `POST` | `/train/collapse` | Train and reload a collapse model |

If saved model files are unavailable, the service contains fallback prediction
logic. The Node layer may also use fallback behavior when a Python inference
request cannot be completed.

For additional microservice detail, see
[`backend/ml-service/README.md`](backend/ml-service/README.md).

## Health Checks And Monitoring

The repository supplies a simple verification script:

```bash
BASE_URL=http://localhost:5000 ./scripts/healthcheck.sh
```

It checks `/health/live` and `/health/ready`. The expanded `/health` endpoint
also checks the ML service and therefore can report degraded status if the
prediction service is unavailable.

Retention rules implemented in MongoDB schemas:

| Collection | Retention |
| --- | --- |
| Metrics | 7 days |
| Events | 30 days |
| Predictions | 90 days |

## Testing And Validation

### Backend

```bash
cd backend
npm ci
npm run check
npm test
```

`npm run check` syntax-checks backend JavaScript files. The Node test suite
currently includes utility and authorization middleware unit tests.

### Frontend

```bash
cd frontend
npm ci
npm run lint
npm run build
```

### Compose configuration

```bash
docker compose config
docker compose -f docker-compose.dev.yml config
```

The GitHub Actions workflow in `.github/workflows/backend-platform.yml` runs
these backend, frontend, and Compose validations for pushes to `main` and for
pull requests.

## Deployment Notes

### Nginx

`infra/nginx/nginx.conf` provides reverse proxy routes for:

- `/` to the frontend container
- `/api` and `/health` to the backend container
- `/socket.io/` to the backend with WebSocket upgrade headers

### systemd and Docker Compose

`deployment/ecosystem-backend.service` manages a Compose installation expected
at `/opt/adaptive-ecosystem-simulator`:

```bash
sudo cp deployment/ecosystem-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ecosystem-backend.service
sudo systemctl status ecosystem-backend.service
```

Adapt the service `WorkingDirectory` if the repository is deployed elsewhere.

### Development Compose file

`docker-compose.dev.yml` is useful for bringing up MongoDB and Redis during
local development. Its backend/frontend hot-reload commands currently assume
development dependencies and Node tooling are available in the final
Dockerfile images, so the reliable hot-reload workflow is to run those two
applications locally as described above.

## Current Implementation Notes

- Reports and the basic `/api/v1/monitor` endpoint are not currently protected
  by authentication in the route implementations.
- The monitor/metrics layer includes approximate active-user counts rather
  than connected-session tracking.
- A newly registered account has role `user`. Admin endpoints require a user
  record with role `admin`.
- Some routes return the standardized `{ success, data, message }` response
  envelope, while earlier simulation/report routes return their payload
  directly. The frontend handles both forms.
- Simulation controls are designed for exploration; this is not a
  scientifically calibrated ecosystem model.

## Contributing

1. Fork the repository and create a feature branch.
2. Make focused changes and update documentation for user-visible behavior.
3. Run the backend tests and frontend lint/build checks.
4. Open a pull request describing behavior changes and verification performed.

Additional project documentation:

- [`docs/api.md`](docs/api.md)
- [`docs/backend-platform.md`](docs/backend-platform.md)
- [`backend/ml-service/README.md`](backend/ml-service/README.md)

## License

The backend package metadata declares the project as MIT licensed. A root
`LICENSE` file is not currently included in this repository; add one before
publishing or redistributing the project under that license.
