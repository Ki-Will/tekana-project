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
- **Live Streaming**: RTMP-based live video streaming with authentication support
- **Community Danger Zones**: Map-based danger zone reporting and alerts
- **Offline Alerts**: SMS/USSD fallbacks for network issues
- **Push Notifications**: Real-time FCM notifications
- **Web Dashboard**: Administrative interface for authorities
- **Incident Management**: Comprehensive incident tracking and response
- **Admin Panel**: User and responder management endpoints

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
   PORT=3086

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

- **API**: http://localhost:3086/api
- **Health Check**: http://localhost:3086/api/health
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **RTMP Stream**: rtmp://localhost:1935/live

## �️ PathGuard - Night Walking Protection

PathGuard provides real-time safety monitoring for users walking alone at night or in unsafe areas. It tracks user location against a planned route and automatically triggers emergency alerts if safety thresholds are breached.

### How It Works

1. **Start Session**:
   - User specifies start location, destination, and optional safety parameters
   - System creates a unique PathGuard session with configurable thresholds

2. **Location Reporting**:
   - Mobile app reports GPS location periodically via `POST /api/path-guard/:sessionId/location`
   - System validates location updates against movement and route deviation rules

3. **Safety Monitoring**:
   - **Route Deviation**: Alerts if user strays more than threshold distance from planned path
   - **Immobility Detection**: Triggers alert if no movement detected for configured timeout
   - **Movement Validation**: Ensures location updates are realistic (speed/accuracy checks)

4. **Emergency Trigger**:
   - If safety breach detected, system automatically:
     - Creates critical incident with location and reason
     - Sends push notifications to user and trusted contacts
     - Auto-assigns nearby available emergency responders
     - Marks session as emergency-triggered

5. **Session Management**:
   - Users can complete sessions manually or automatically on emergency
   - Location history is stored for analysis and response coordination

### Configuration

PathGuard behavior is configurable via environment variables:

- `PATH_GUARD_DEVIATION_THRESHOLD_METERS`: Maximum allowed deviation from route (default: 50m)
- `PATH_GUARD_IMMOBILITY_TIMEOUT_SECONDS`: Maximum inactivity before alert (default: 300s)
- `PATH_GUARD_MOVEMENT_THRESHOLD_METERS`: Minimum distance for "movement" (default: 3m)
- `PATH_GUARD_MOVEMENT_SPEED_THRESHOLD_MS`: Minimum speed for "movement" (default: 0.5 m/s)

### API Endpoints

- `POST /api/path-guard/start` - Start new PathGuard session
- `GET /api/path-guard/active` - Get current active session
- `POST /api/path-guard/:sessionId/location` - Report location update
- `POST /api/path-guard/:sessionId/complete` - Complete session manually

### Safety Features

- Automatic responder dispatch based on proximity and availability
- Integration with incident management system
- Real-time notifications via push and SMS
- Geocoded addresses for precise emergency response
- Offline-capable location reporting

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh token

### Incidents
- `POST /api/incidents` - Report incident
- `GET /api/incidents` - List incidents
- `GET /api/incidents/:id` - Get incident details

### Media
- `POST /api/media/upload/:incidentId` - Upload media file (multipart/form-data, async processing)
- `GET /api/media/:id` - Get media
- `GET /api/media/incident/:incidentId` - Get media for incident

### Streaming
- `POST /api/streaming/publish` - RTMP publish hook
- `POST /api/streaming/publish_done` - RTMP publish done hook
- `POST /api/streaming/play` - RTMP play hook
- `POST /api/streaming/play_done` - RTMP play done hook

### Admin (Requires ADMIN role)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user by ID
- `PATCH /api/admin/users/:id/role` - Update user role
- `GET /api/admin/responders` - Get all responders
- `GET /api/admin/responders/:id` - Get responder by ID
- `POST /api/admin/responders` - Create responder profile (optionally with user)
- `DELETE /api/admin/responders/:id` - Delete responder profile
- `PATCH /api/admin/responders/:id/status` - Update responder status

### Danger Zones
- `POST /api/danger-zones` - Report danger zone
- `GET /api/danger-zones` - List danger zones

## 📹 Live Streaming

Tekana supports RTMP live streaming with automatic recording and upload to MinIO.

### Streaming Setup

1. **Get Stream Key:**
   When creating an incident via `POST /api/incidents`, the response includes a unique `streamKey` (UUID).

2. **Publish Stream with OBS Studio:**
   - Open OBS Studio
   - In Settings > Stream, select Custom
   - Server: `rtmp://localhost:1935/live`
   - Stream Key: `{streamKey}` (from incident response)
   - For authentication (optional): Append `?user={phone}&pass={password}` to the Server URL
   - Start streaming

   **Audio-Only Streaming:** Audio-only streaming is supported. In OBS, disable video output in Settings > Video > Base (Canvas) Resolution and Output (Scaled) Resolution set to 1x1 or use an audio-only source.

3. **Stop Streaming:**
   Stop the stream in OBS. The recording is automatically saved locally to `./recordings` and uploaded to MinIO at `streams/{streamKey}-{timestamp}.flv`.

4. **Play Stream (if needed):**
   Use VLC or any RTMP player:
   ```
   rtmp://localhost:1935/live/{streamKey}
   ```

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


