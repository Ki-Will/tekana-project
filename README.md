# Tekana - Safety & Rescue Platform

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white" alt="RabbitMQ" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

## 📋 Description

Tekana is a mobile-first safety and rescue platform designed to provide instant emergency alerts and community-driven safety features. It enables users to send one-tap SOS alerts with GPS location, audio/video evidence, and integrates with emergency responders for rapid response.

## ✨ Features

- **One-Tap SOS**: Instant emergency alerts with GPS location
- **Media Upload**: Audio/video evidence capture and async processing
- **PathGuard**: Night walking protection with safety routes
- **Live Streaming**: RTMP-based live video streaming with automatic recording
- **Community Danger Zones**: Map-based danger zone reporting and alerts
- **Offline Alerts**: SMS/USSD fallbacks for network issues
- **Push Notifications**: Real-time FCM notifications
- **Web Dashboard**: Administrative interface for authorities
- **Incident Management**: Comprehensive incident tracking and response

## 🛠 Tech Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Message Queue**: RabbitMQ
- **File Storage**: MinIO (S3-compatible)
- **Live Streaming**: Nginx RTMP Module
- **Authentication**: JWT
- **Notifications**: Firebase Cloud Messaging (FCM)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Deployment**: Production-ready with profiles

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git

## 🚀 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/tekana.git
   cd tekana
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Copy the example environment file and configure:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://tekana:password@localhost:5432/tekana"

   # JWT
   JWT_SECRET="your-jwt-secret"

   # Firebase
   FCM_SERVER_KEY="your-fcm-server-key"

   # Port
   PORT=3000

   # RabbitMQ (optional, defaults provided)
   RABBITMQ_URL="amqp://guest:guest@localhost:5672"

   # Redis (optional, defaults provided)
   REDIS_URL="redis://localhost:6379"

   # MinIO/S3
   S3_ENDPOINT="http://localhost:9000"
   AWS_ACCESS_KEY_ID="minioadmin"
   AWS_SECRET_ACCESS_KEY="minioadmin"
   AWS_REGION="us-east-1"
   S3_BUCKET_NAME="tekana-media"
   ```

## 🏃‍♂️ Running the Application

### Development Environment

Start all services with Docker Compose:
```bash
# Start all services (PostgreSQL, RabbitMQ, Redis, MinIO, RTMP, App)
docker-compose --profile development up

# Or run in background
docker-compose --profile development up -d
```

### Production Environment

For production, only essential services:
```bash
docker-compose --profile production up -d
```

### Local Development (without Docker)

1. **Start dependencies:**
   ```bash
   docker-compose up postgres rabbitmq redis minio rtmp -d
   ```

2. **Run the app locally:**
   ```bash
   npm run start:dev
   ```

### Access Points

- **API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **RTMP Stream**: rtmp://localhost:1935/live

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh token

### Incidents
- `POST /api/incidents` - Report incident
- `GET /api/incidents` - List incidents
- `GET /api/incidents/:id` - Get incident details

### Media
- `POST /api/media/upload` - Upload media (async)
- `GET /api/media/:id` - Get media

### Streaming
- `POST /api/streaming/publish` - RTMP publish hook
- `POST /api/streaming/publish_done` - RTMP publish done hook
- `POST /api/streaming/play` - RTMP play hook
- `POST /api/streaming/play_done` - RTMP play done hook

### Danger Zones
- `POST /api/danger-zones` - Report danger zone
- `GET /api/danger-zones` - List danger zones

## 📹 Live Streaming

Tekana supports RTMP live streaming with automatic recording to MinIO.

### Streaming Setup

1. **Publish Stream:**
   ```bash
   ffmpeg -f avfoundation -i "0:0" -f flv rtmp://localhost:1935/live/your-stream-key
   ```

2. **Play Stream:**
   Use any RTMP player or VLC:
   ```
   rtmp://localhost:1935/live/your-stream-key
   ```

3. **Recorded Streams:**
   Streams are automatically recorded and uploaded to MinIO at `streams/your-stream-key.flv`

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🏗 Database

### Migrations
```bash
# Generate migration
npx prisma migrate dev

# Apply migrations
npx prisma migrate deploy

# Seed database
npx prisma db seed
```

### Prisma Studio
```bash
npx prisma studio
```

## 🚢 Deployment

### Docker Build
```bash
docker build -t tekana .
```

### Production Compose
```bash
docker-compose --profile production up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add some feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For questions and support:
- Create an issue on GitHub
- Contact the development team


