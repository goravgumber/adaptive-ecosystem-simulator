# Backend Platform Architecture

Adaptive Ecosystem Simulator is structured as a distributed backend portfolio project:

- Express API with versioned routes under `/api/v1`
- MongoDB persistence through Mongoose models and repository classes
- Redis-backed rate limiting, token revocation, cache, and BullMQ queues
- Socket.IO realtime transport with JWT authentication
- Python ML microservice for training and inference
- Docker Compose orchestration with frontend, backend, ML service, MongoDB, Redis, and Nginx

## Core Request Flow

1. Client authenticates through `/api/v1/auth/login`.
2. Backend returns an access token and refresh token.
3. Protected API and websocket requests validate JWT claims.
4. Long-running work is sent to BullMQ instead of blocking HTTP requests.
5. Workers emit realtime updates through Socket.IO where appropriate.
6. Operational state is exposed through health, readiness, queue, metrics, and admin endpoints.

## Backend Features

- `GET /health/live` for container liveness.
- `GET /health/ready` for dependency readiness.
- `POST /api/v1/auth/refresh` for refresh token rotation.
- `POST /api/v1/auth/logout` and `/logout-all` for session revocation.
- `GET /api/v1/admin/overview` for platform summary.
- `GET /api/v1/admin/users` for admin user inventory.
- `GET /api/v1/queues` for BullMQ queue counts.
- `POST /api/v1/queues/background-tasks/jobs` to enqueue approved jobs.

## Scalability Value

The API is kept responsive by moving expensive tasks to queues. Redis centralizes shared state for throttling, cache, and token revocation. Versioned APIs make future client migrations possible without breaking older frontend calls.

## Resume Value

This project now demonstrates practical backend concerns:

- API versioning and compatibility strategy
- JWT access and refresh token lifecycle
- RBAC and admin operations
- Background jobs and queue observability
- Health/readiness probes for cloud deployments
- Dockerized service orchestration
- CI checks for backend, frontend, and Docker configuration
