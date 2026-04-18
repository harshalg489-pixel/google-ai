# Supply Chain Disruption Detection System

A modern, production-ready web application that proactively detects and mitigates supply chain disruptions using real-time data and AI-powered analytics.

![System Architecture](docs/architecture.png)

## Features

### Real-Time Dashboard
- Interactive shipment tracking with Mapbox/Leaflet maps
- Risk heatmaps showing weather zones and congestion areas
- Live KPIs: ETA accuracy, delay probability, active disruptions
- Dark/light mode support with smooth animations

### AI Risk Detection Engine
- Multi-source data ingestion (weather, traffic, port congestion)
- ML-powered anomaly detection with risk scoring
- Predictive delay probability calculations
- Historical pattern analysis

### Predictive Routing System
- Dynamic route optimization based on time, cost, and risk
- Real-time "before vs after" ETA comparisons
- Alternative route suggestions with confidence scores

### Alerts & Notifications
- AI-generated human-readable disruption warnings
- Severity-based alert classification
- WebSocket-powered real-time updates
- Actionable recommendations with one-click execution

### AI Assistant Panel
- Chat-based insights and recommendations
- Natural language queries for shipment status
- Predictive "what-if" scenario analysis

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React Frontend │────▶│  FastAPI Backend │────▶│   PostgreSQL    │
│   (Port 5173)   │     │   (Port 8000)   │     │   (Port 5432)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Risk Analysis   │  │ Routing Optimizer│  │  Data Simulator │
│     Engine       │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               ▼
                        ┌─────────────────┐
                        │  External APIs  │
                        │  - Weather       │
                        │  - Traffic       │
                        │  - Port Data     │
                        └─────────────────┘
```

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Mapbox GL JS** for interactive maps
- **Recharts** for data visualization
- **Framer Motion** for animations
- **Socket.io Client** for real-time updates
- **React Query** for state management
- **Zustand** for global state

### Backend
- **Python 3.11** with FastAPI
- **SQLAlchemy** ORM with PostgreSQL
- **Pydantic** for data validation
- **Celery** for background tasks
- **Redis** for caching and message queue
- **WebSockets** via Socket.io
- **Alembic** for database migrations

### Infrastructure
- **Docker** & Docker Compose
- **PostgreSQL 15** for data storage
- **Nginx** for reverse proxy (production)

## Quick Start

### Prerequisites
- Docker Desktop
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Docker Setup (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd supply-chain-disruption-system
```

2. Copy environment file:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Start all services:
```bash
docker-compose up -d
```

4. Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

5. Start the data simulator (optional):
```bash
docker-compose --profile simulation up -d
```

### Local Development Setup

#### Backend Setup

1. Create virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up PostgreSQL:
```bash
# Using Docker
docker run -d --name postgres \
  -e POSTGRES_USER=supplychain \
  -e POSTGRES_PASSWORD=supplychain123 \
  -e POSTGRES_DB=supplychain_db \
  -p 5432:5432 postgres:15-alpine
```

4. Run migrations:
```bash
alembic upgrade head
```

5. Start the backend:
```bash
uvicorn main:app --reload --port 8000
```

#### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Shipments
- `GET /api/v1/shipments` - List all shipments
- `GET /api/v1/shipments/{id}` - Get shipment details
- `POST /api/v1/shipments` - Create new shipment
- `PUT /api/v1/shipments/{id}/reroute` - Reroute shipment

### Risk Analysis
- `GET /api/v1/risk/shipments/{id}` - Get risk assessment
- `GET /api/v1/risk/heatmap` - Get risk heatmap data
- `POST /api/v1/risk/analyze` - Trigger risk analysis

### Routes
- `GET /api/v1/routes/optimize` - Get optimized routes
- `POST /api/v1/routes/calculate` - Calculate route with alternatives

### Alerts
- `GET /api/v1/alerts` - List active alerts
- `PUT /api/v1/alerts/{id}/acknowledge` - Acknowledge alert

### Analytics
- `GET /api/v1/analytics/kpi` - Get KPI metrics
- `GET /api/v1/analytics/trends` - Get trend data
- `GET /api/v1/analytics/forecasts` - Get predictions

## WebSocket Events

### Client → Server
- `subscribe:shipment` - Subscribe to shipment updates
- `subscribe:alerts` - Subscribe to new alerts
- `request:analysis` - Request AI analysis

### Server → Client
- `shipment:update` - Shipment status update
- `alert:new` - New alert notification
- `risk:update` - Risk score update
- `kpi:update` - Real-time KPI updates

## Database Schema

### Core Tables
- `shipments` - Shipment data
- `routes` - Route information
- `risk_events` - Detected risk events
- `alerts` - Generated alerts
- `historical_delays` - Past delay records
- `weather_data` - Cached weather information

### Relationships
```
shipments ───► routes (one-to-many)
shipments ───► risk_events (one-to-many)
shipments ───► alerts (one-to-many)
routes ─────► historical_delays (one-to-many)
```

## Risk Scoring Algorithm

The risk score (0-100) is calculated based on:

1. **Weather Risk (30%)**
   - Current conditions at route waypoints
   - Forecasted severe weather
   - Historical weather patterns

2. **Congestion Risk (25%)**
   - Port congestion levels
   - Traffic density
   - Customs processing delays

3. **Operational Risk (20%)**
   - Carrier reliability score
   - Equipment availability
   - Previous delays on route

4. **Geopolitical Risk (15%)**
   - Regional stability
   - Trade restrictions
   - Sanctions/embargoes

5. **Historical Risk (10%)**
   - Past performance on similar routes
   - Seasonal patterns

## Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Load Testing
```bash
# Using k6
cd tests/load
k6 run load_test.js
```

## Deployment

### Production Build
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `ENVIRONMENT` | Environment name | `development` |
| `CORS_ORIGINS` | Allowed CORS origins | - |
| `REDIS_URL` | Redis connection string | - |
| `WEATHER_API_KEY` | OpenWeatherMap API key | - |
| `VITE_MAPBOX_TOKEN` | Mapbox access token | - |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file

## Support

For support, email support@supplychain-ai.com or join our Slack channel.
