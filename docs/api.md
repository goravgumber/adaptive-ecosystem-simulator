# API Reference

Base URL: `/api/v1`

## Auth

- `POST /auth/signup`
- `POST /auth/register` (requires `email`, `username`, and a password of at least 8 characters)
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `GET /auth/validate`
- `GET /auth/me`

Login returns:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "...",
    "username": "demo",
    "role": "user"
  }
}
```

## Operations

- `GET /admin/overview`
- `GET /admin/users`
- `PATCH /admin/users/:userId/role`
- `GET /queues`
- `GET /queues/:queueName/jobs`
- `GET /queues/:queueName/jobs/:jobId`
- `POST /queues/:queueName/jobs`

Queue job names currently supported:

- `ml-training`
- `prediction-generation`
- `alert-processing`
- `report-generation`
- `event-cleanup`

## Health

- `GET /health`
- `GET /health/live`
- `GET /health/ready`
