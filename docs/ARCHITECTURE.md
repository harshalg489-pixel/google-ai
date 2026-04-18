# System Architecture

## Overview

The Supply Chain Disruption Detection System is built as a modern, cloud-native application with a microservices-oriented architecture. It leverages real-time data processing, machine learning, and WebSocket-based communication to provide instant insights and alerts.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Client Layer                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │   Web App    │  │  Mobile App  │  │   API Keys   │                      │
│  │   (React)    │  │   (Future)   │  │              │                      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                      │
└─────────┼─────────────────┼─────────────────┼──────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API Gateway (Nginx)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Application Layer                                   │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                     FastAPI Application                            │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │    │
│  │  │   REST API   │ │  WebSocket   │ │  Background  │              │    │
│  │  │   Router     │ │   Handler    │ │    Tasks     │              │    │
│  │  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘              │    │
│  └─────────┼────────────────┼────────────────┼───────────────────────┘    │
└────────────┼────────────────┼────────────────┼────────────────────────────┘
             │                │                │
             ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Service Layer                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │    Risk      │  │   Routing    │  │    Alert     │                      │
│  │  Analysis    │  │  Optimizer   │  │   Service    │                      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │   Weather    │  │   Traffic    │  │    Chat      │                      │
│  │    Service   │  │    Service   │  │   Assistant  │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
             │                │                │
             ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Data Layer                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  PostgreSQL  │  │    Redis     │  │  Time-Series │  │   Object     │  │
│  │   (Primary)  │  │   (Cache)    │  │    (Future)  │  │   Storage    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components

### Frontend (React + TypeScript)

The frontend is built with modern React patterns:

- **State Management**: Zustand for global state, React Query for server state
- **Styling**: Tailwind CSS with custom design tokens
- **Animations**: Framer Motion for smooth transitions
- **Maps**: Mapbox GL JS for interactive mapping
- **Charts**: Recharts for data visualization
- **Real-time**: Socket.io Client for WebSocket connections

Key Features:
- Responsive design supporting desktop and tablet
- Dark/light mode theme support
- Real-time updates via WebSockets
- Offline-first capabilities with React Query caching

### Backend (FastAPI + Python)

The backend follows a layered architecture:

#### API Layer
- RESTful endpoints for CRUD operations
- WebSocket handlers for real-time communication
- Pydantic models for request/response validation

#### Service Layer
- **Risk Analysis Service**: Calculates risk scores using multiple factors
- **Routing Service**: Optimizes routes based on time, cost, and risk
- **Alert Service**: Manages notifications and recommendations
- **Chat Service**: AI-powered conversational interface

#### Data Access Layer
- SQLAlchemy ORM for database interactions
- Repository pattern for data access abstraction
- Redis caching for frequently accessed data

### Database (PostgreSQL)

Schema design optimized for:
- Efficient querying of shipment data
- Geospatial queries for location-based features
- Time-series data for historical analysis

Key Tables:
- `shipments`: Core shipment information
- `routes`: Route planning and optimization
- `risk_events`: Detected risk factors
- `alerts`: Generated notifications
- `weather_data`: Cached weather information
- `historical_delays`: Past performance data

### Real-Time Communication

WebSocket implementation:
- Event-driven architecture
- Room-based subscriptions for targeted updates
- Automatic reconnection with exponential backoff

### Background Processing

Celery tasks for:
- Periodic risk assessments
- Weather data updates
- Alert generation
- Data aggregation for analytics

## Security

- JWT-based authentication
- CORS configuration for API security
- SQL injection prevention via ORM
- XSS protection in frontend
- Input validation with Pydantic

## Scalability

Horizontal scaling strategies:
- Stateless API design
- Redis for session management
- Database read replicas
- CDN for static assets
- Container orchestration with Kubernetes (future)

## Monitoring

Planned observability stack:
- Prometheus for metrics
- Grafana for dashboards
- ELK stack for logging
- Jaeger for distributed tracing

## Deployment

Containerized deployment with:
- Docker for local development
- Docker Compose for orchestration
- Kubernetes manifests for production (future)
- GitHub Actions for CI/CD (future)
