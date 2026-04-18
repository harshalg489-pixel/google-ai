# API Documentation

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication
Authentication is planned for future releases. Currently, the API is open for development purposes.

## Endpoints

### Shipments

#### List Shipments
```http
GET /shipments
```

Query Parameters:
- `page` (int): Page number (default: 1)
- `page_size` (int): Items per page (default: 20, max: 100)
- `status` (string[]): Filter by status
- `risk_level` (string[]): Filter by risk level
- `transport_mode` (string[]): Filter by transport mode

Response:
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "total_pages": 5
}
```

#### Get Shipment
```http
GET /shipments/{id}
```

#### Create Shipment
```http
POST /shipments
```

Request Body:
```json
{
  "tracking_number": "ABC123456789",
  "carrier": "Maersk",
  "transport_mode": "sea",
  "origin": {
    "latitude": 1.29,
    "longitude": 103.85,
    "name": "Singapore",
    "country_code": "SG",
    "port_code": "SIN"
  },
  "destination": {
    "latitude": 33.73,
    "longitude": -118.26,
    "name": "Los Angeles",
    "country_code": "US",
    "port_code": "LAX"
  },
  "planned_eta": "2024-12-31T23:59:00Z",
  "cargo_type": "Electronics",
  "weight_kg": 25000,
  "value_usd": 500000
}
```

#### Update Shipment
```http
PUT /shipments/{id}
```

#### Reroute Shipment
```http
PUT /shipments/{id}/reroute
```

Request Body:
```json
{
  "new_route_id": "route-uuid",
  "reason": "Port congestion",
  "notify_stakeholders": true
}
```

### Risk Analysis

#### Get Shipment Risk
```http
GET /shipments/{id}/risk
```

Response:
```json
{
  "shipment_id": "uuid",
  "overall_risk_score": 65.5,
  "risk_level": "high",
  "weather_risk": 45.2,
  "congestion_risk": 78.3,
  "operational_risk": 52.1,
  "geopolitical_risk": 23.4,
  "historical_risk": 34.5,
  "factors": [...],
  "recommendations": [...],
  "assessed_at": "2024-01-01T00:00:00Z"
}
```

#### Get Risk Heatmap
```http
GET /risk/heatmap?min_lat={min}&max_lat={max}&min_lon={min}&max_lon={max}
```

### Routes

#### Optimize Route
```http
POST /routes/optimize
```

Request Body:
```json
{
  "shipment_id": "uuid",
  "origin": { "latitude": 1.29, "longitude": 103.85, "name": "Singapore" },
  "destination": { "latitude": 33.73, "longitude": -118.26, "name": "Los Angeles" },
  "transport_modes": ["sea", "air"],
  "optimize_for": "balanced",
  "departure_time": "2024-01-01T00:00:00Z"
}
```

Response:
```json
{
  "current_route": {...},
  "alternatives": [...],
  "recommended_route_id": "route-uuid",
  "reasoning": "Recommended route is 12 hours faster, $500 cheaper."
}
```

### Alerts

#### List Alerts
```http
GET /alerts?shipment_id={id}&severity=high,critical
```

#### Acknowledge Alert
```http
PUT /alerts/{id}/acknowledge?acknowledged_by={user}
```

### Analytics

#### Get KPI Dashboard
```http
GET /analytics/kpi
```

Response:
```json
{
  "total_shipments": 1250,
  "active_shipments": 480,
  "on_time_percentage": 87.5,
  "delayed_shipments": 45,
  "at_risk_shipments": 23,
  "avg_eta_accuracy": 91.2,
  "avg_delay_probability": 12.3,
  "active_disruptions": 68,
  "total_alerts_24h": 34,
  "critical_alerts": 5,
  "cost_savings_optimization": 25000.00,
  "trend_direction": "up"
}
```

#### Get Trends
```http
GET /analytics/trends?metric=delays&period=7d
```

Metrics: `delays`, `risk`, `volume`, `alerts`
Periods: `24h`, `7d`, `30d`, `90d`

### Simulation

#### Run Simulation
```http
POST /simulate
```

Request Body:
```json
{
  "scenario_type": "port_closure",
  "severity": "high",
  "affected_region": { "lat": 1.29, "lon": 103.85, "radius_km": 500 },
  "delay_hours": 48,
  "description": "Port of Singapore closed due to maintenance"
}
```

### Chat

#### Send Message
```http
POST /chat
```

Request Body:
```json
{
  "message": "Show me at-risk shipments",
  "conversation_id": "optional-id",
  "shipment_context": "optional-shipment-ids"
}
```

Response:
```json
{
  "message": "Found 12 shipments at risk...",
  "conversation_id": "uuid",
  "suggested_actions": [
    { "action": "view_risk_map", "label": "View Risk Map" }
  ],
  "relevant_shipments": ["id1", "id2"],
  "confidence": 0.92
}
```

## WebSocket

Connect to WebSocket at:
```
ws://localhost:8000/ws
```

### Subscribe to Events
```json
{
  "type": "subscribe:shipments"
}
```

### Incoming Events

#### Shipment Update
```json
{
  "type": "shipment:update",
  "payload": {
    "shipment_id": "uuid",
    "risk_score": 75.5,
    "risk_level": "high",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

#### New Alert
```json
{
  "type": "alert:new",
  "payload": {
    "alert_id": "uuid",
    "shipment_id": "uuid",
    "title": "High congestion risk",
    "severity": "high"
  }
}
```

## Error Responses

All errors follow this format:
```json
{
  "detail": "Error description",
  "status_code": 400
}
```

Common status codes:
- `400` - Bad Request
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error
