# Deployment Guide

## Services and where each deploys

| Service | Platform | Free Tier |
|---|---|---|
| backend | Railway | Yes |
| simulation-service | Railway | Yes |
| ml-service | Render | Yes |
| frontend | Vercel | Yes |
| MongoDB | Atlas | 512MB |
| Redis | Upstash | 10k req/d |

## Environment Variables

### Backend
| Variable | Required | Default | Where to get |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Set to `production` |
| `PORT` | No | `5000` | Railway assigns |
| `MONGO_URI` | Yes | - | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | - | Generate with `openssl rand -hex 32` |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | - |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | - |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | Upstash Redis URL |
| `ML_SERVICE_URL` | Yes | `http://localhost:8000` | Render ML service URL |
| `SIMULATION_SERVICE_URL` | Yes | `http://localhost:3001` | Railway sim service URL |
| `FRONTEND_URL` | Recommended | - | Vercel deployment URL |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | - |
| `RATE_LIMIT_MAX` | No | `100` | - |

### ML Service
| Variable | Default | Where to get |
|---|---|---|
| `ML_SERVICE_PORT` | `8000` | Render assigns |
| `OPENAI_API_KEY` | - | OpenAI dashboard |
| `REDIS_URL` | `redis://localhost:6379` | Upstash Redis URL |

### Frontend
| Variable | Default | Where to get |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000` | Backend Railway URL |
| `VITE_ML_URL` | `http://localhost:8000` | ML Render URL |
| `VITE_SOCKET_URL` | `http://localhost:5000` | Backend Railway URL |

## Step-by-step Deploy

### 1. MongoDB Atlas
1. Create a free cluster at atlas.mongodb.com
2. Create a database user
3. Get connection string (mongodb+srv://...)
4. Set as `MONGO_URI`

### 2. Upstash Redis
1. Create a Redis database at upstash.com
2. Get REST URL and password
3. Set as `REDIS_URL`

### 3. ML Service (Render)
1. Create a Web Service from `backend/ml-service`
2. Start command: `uvicorn ml_service:app --host 0.0.0.0 --port 8000`
3. Set environment variables

### 4. Simulation Service (Railway)
1. Create a new project from `simulation-service`
2. Start command: `node server.js`
3. No env vars needed

### 5. Backend (Railway)
1. Create a new project from `backend`
2. Start command: `node server.js`
3. Set all environment variables

### 6. Frontend (Vercel)
1. Import `frontend` repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Set environment variables
