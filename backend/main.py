from datetime import datetime, timedelta
from typing import List, Optional
from contextlib import asynccontextmanager
import os
import random

from fastapi import FastAPI, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
import asyncio
import logging

from database import get_db, init_db, engine, SessionLocal, check_db_health
from models import (
    Shipment, Route, RiskEvent, Alert, AnalyticsSnapshot,
    ShipmentStatus, RiskLevel, TransportMode, WeatherData
)
from schemas import (
    ShipmentCreate, ShipmentUpdate, ShipmentResponse, ShipmentListResponse,
    RouteOptimizationRequest, RouteOptimizationResponse, RerouteRequest,
    RiskAssessment, AlertCreate, AlertResponse, KPIDashboard, TrendResponse,
    SimulationScenario, SimulationResult, ChatRequest, ChatResponse,
    ShipmentFilter, PaginatedResponse, WebSocketMessage, HeatmapPoint,
    DisruptionPredictionResponse, SupplyChainHealthResponse
)
from services.risk_analysis import RiskAnalysisService
from services.routing import RoutingService
from services.alerts import AlertsService


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    asyncio.create_task(data_simulation_task())
    yield


logger = logging.getLogger("supplychain.api")
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Supply Chain Disruption Detection System",
    description="Real-time AI-powered supply chain monitoring and optimization",
    version="1.0.0",
    lifespan=lifespan
)

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    logger.warning(f"Validation error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"message": str(exc)},
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"message": "A database error occurred. Please try again later."},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"message": "An unexpected error occurred."},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

connected_websockets: List[WebSocket] = []


async def broadcast_message(message: dict):
    disconnected = []
    for ws in connected_websockets:
        try:
            await ws.send_json(message)
        except Exception as e:
            logger.warning(f"Failed to send to websocket: {e}")
            disconnected.append(ws)

    for ws in disconnected:
        if ws in connected_websockets:
            connected_websockets.remove(ws)


async def data_simulation_task():
    while True:
        await asyncio.sleep(10)
        db = SessionLocal()
        try:
            shipments = db.query(Shipment).filter(
                Shipment.current_status.in_([ShipmentStatus.IN_TRANSIT, ShipmentStatus.AT_RISK])
            ).all()

            if shipments and random.random() < 0.2:
                shipment = random.choice(shipments)
                shipment.risk_score = min(max(shipment.risk_score + random.uniform(-10, 15), 0), 100)

                if shipment.risk_score > 75:
                    shipment.risk_level = RiskLevel.CRITICAL
                elif shipment.risk_score > 55:
                    shipment.risk_level = RiskLevel.HIGH
                elif shipment.risk_score > 35:
                    shipment.risk_level = RiskLevel.MEDIUM
                else:
                    shipment.risk_level = RiskLevel.LOW

                db.commit()

                await broadcast_message({
                    "type": "shipment:update",
                    "payload": {
                        "shipment_id": shipment.id,
                        "risk_score": shipment.risk_score,
                        "risk_level": shipment.risk_level.value,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                })

        except Exception as e:
            logger.error(f"Simulation error: {e}")
            db.rollback()
        finally:
            db.close()


@app.get("/")
async def root():
    return {"message": "Supply Chain Disruption Detection API", "version": "1.0.0"}


@app.get("/api/v1/health")
async def health_check():
    db_healthy = check_db_health()
    overall_status = "healthy" if db_healthy else "degraded"
    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": "connected" if db_healthy else "disconnected",
            "websocket": "active"
        }
    }


@app.get("/api/v1/shipments", response_model=PaginatedResponse)
async def list_shipments(
    status: Optional[List[ShipmentStatus]] = Query(None),
    risk_level: Optional[List[RiskLevel]] = Query(None),
    transport_mode: Optional[List[TransportMode]] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Shipment)

    if status:
        query = query.filter(Shipment.current_status.in_(status))
    if risk_level:
        query = query.filter(Shipment.risk_level.in_(risk_level))
    if transport_mode:
        query = query.filter(Shipment.transport_mode.in_(transport_mode))

    total = query.count()
    shipments = query.offset((page - 1) * pageSize).limit(pageSize).all()

    items = []
    for s in shipments:
        items.append({
            "id": s.id,
            "tracking_number": s.tracking_number,
            "carrier": s.carrier,
            "transport_mode": s.transport_mode,
            "current_status": s.current_status,
            "risk_score": s.risk_score,
            "risk_level": s.risk_level,
            "planned_eta": s.planned_eta,
            "origin_name": s.origin.get("name", ""),
            "destination_name": s.destination.get("name", ""),
            "origin_lat": s.origin.get("latitude", 0),
            "origin_lon": s.origin.get("longitude", 0),
            "destination_lat": s.destination.get("latitude", 0),
            "destination_lon": s.destination.get("longitude", 0)
        })

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        pageSize=pageSize,
        total_pages=(total + pageSize - 1) // pageSize
    )


@app.get("/api/v1/shipments/{shipment_id}", response_model=ShipmentResponse)
async def get_shipment(shipment_id: str, db: Session = Depends(get_db)):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment


@app.post("/api/v1/shipments", response_model=ShipmentResponse)
async def create_shipment(shipment: ShipmentCreate, db: Session = Depends(get_db)):
    db_shipment = Shipment(
        tracking_number=shipment.tracking_number,
        carrier=shipment.carrier,
        transport_mode=shipment.transport_mode,
        origin=shipment.origin.model_dump(),
        destination=shipment.destination.model_dump(),
        planned_eta=shipment.planned_eta,
        cargo_type=shipment.cargo_type,
        weight_kg=shipment.weight_kg,
        value_usd=shipment.value_usd,
        current_status=ShipmentStatus.PENDING
    )

    db.add(db_shipment)
    db.commit()
    db.refresh(db_shipment)

    await broadcast_message({
        "type": "shipment:new",
        "payload": {"shipment_id": db_shipment.id, "tracking_number": db_shipment.tracking_number}
    })

    return db_shipment


@app.put("/api/v1/shipments/{shipment_id}")
async def update_shipment(
    shipment_id: str,
    update: ShipmentUpdate,
    db: Session = Depends(get_db)
):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    if update.current_status is not None:
        shipment.current_status = update.current_status
    if update.current_location is not None:
        shipment.current_location = update.current_location.model_dump()
    if update.actual_eta is not None:
        shipment.actual_eta = update.actual_eta
    if update.risk_score is not None:
        shipment.risk_score = update.risk_score
        # Auto-update risk level based on score
        if shipment.risk_score > 75:
            shipment.risk_level = RiskLevel.CRITICAL
        elif shipment.risk_score > 55:
            shipment.risk_level = RiskLevel.HIGH
        elif shipment.risk_score > 35:
            shipment.risk_level = RiskLevel.MEDIUM
        else:
            shipment.risk_level = RiskLevel.LOW
    if update.risk_level is not None:
        shipment.risk_level = update.risk_level

    shipment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(shipment)

    await broadcast_message({
        "type": "shipment:update",
        "payload": {
            "shipment_id": shipment.id,
            "current_status": shipment.current_status.value,
            "risk_score": shipment.risk_score,
            "timestamp": datetime.utcnow().isoformat()
        }
    })

    return {"success": True, "shipment_id": shipment.id}


@app.get("/api/v1/shipments/{shipment_id}/risk", response_model=RiskAssessment)
async def get_shipment_risk(shipment_id: str, db: Session = Depends(get_db)):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    service = RiskAnalysisService(db)
    assessment = await service.assess_shipment_risk(shipment)

    shipment.risk_score = assessment.overall_risk_score
    shipment.risk_level = assessment.risk_level
    db.commit()

    alerts_service = AlertsService(db)
    alert = await alerts_service.generate_alert(shipment, assessment.overall_risk_score, assessment.factors)

    if alert:
        await broadcast_message({
            "type": "alert:new",
            "payload": {
                "alert_id": alert.id,
                "shipment_id": shipment_id,
                "title": alert.title,
                "severity": alert.severity.value
            }
        })

    return assessment


@app.post("/api/v1/routes/optimize", response_model=RouteOptimizationResponse)
async def optimize_route(request: RouteOptimizationRequest, db: Session = Depends(get_db)):
    service = RoutingService(db)
    return await service.optimize_route(request)


@app.put("/api/v1/shipments/{shipment_id}/reroute")
async def reroute_shipment(
    shipment_id: str,
    request: RerouteRequest,
    db: Session = Depends(get_db)
):
    service = RoutingService(db)
    result = await service.reroute_shipment(shipment_id, request)

    await broadcast_message({
        "type": "shipment:reroute",
        "payload": {
            "shipment_id": shipment_id,
            "new_route_id": request.new_route_id,
            "time_saved": result["time_saved_hours"]
        }
    })

    return result


@app.get("/api/v1/risk/heatmap")
async def get_risk_heatmap(
    min_lat: float = Query(-90, ge=-90, le=90),
    max_lat: float = Query(90, ge=-90, le=90),
    min_lon: float = Query(-180, ge=-180, le=180),
    max_lon: float = Query(180, ge=-180, le=180),
    db: Session = Depends(get_db)
):
    service = RiskAnalysisService(db)
    bounds = {"min_lat": min_lat, "max_lat": max_lat, "min_lon": min_lon, "max_lon": max_lon}
    return await service.generate_risk_heatmap(bounds)


@app.get("/api/v1/alerts")
async def list_alerts(
    shipment_id: Optional[str] = Query(None),
    severity: Optional[List[RiskLevel]] = Query(None),
    acknowledged: Optional[bool] = Query(False),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Alert)

    if shipment_id:
        query = query.filter(Alert.shipment_id == shipment_id)
    if severity:
        query = query.filter(Alert.severity.in_(severity))
    if acknowledged is not None:
        query = query.filter(Alert.is_acknowledged == acknowledged)

    alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()

    return [AlertResponse.model_validate(a) for a in alerts]


@app.put("/api/v1/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, acknowledged_by: str = Query(...), db: Session = Depends(get_db)):
    service = AlertsService(db)
    alert = await service.acknowledge_alert(alert_id, acknowledged_by)
    return AlertResponse.model_validate(alert)


@app.get("/api/v1/analytics/kpi", response_model=KPIDashboard)
async def get_kpi_dashboard(db: Session = Depends(get_db)):
    total = db.query(Shipment).count()
    active = db.query(Shipment).filter(Shipment.current_status == ShipmentStatus.IN_TRANSIT).count()
    delayed = db.query(Shipment).filter(Shipment.current_status == ShipmentStatus.DELAYED).count()
    at_risk = db.query(Shipment).filter(Shipment.risk_level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL])).count()

    on_time = db.query(Shipment).filter(
        Shipment.current_status.in_([ShipmentStatus.DELIVERED, ShipmentStatus.IN_TRANSIT]),
        Shipment.risk_score < 35
    ).count()

    on_time_pct = (on_time / total * 100) if total > 0 else 0

    avg_risk = db.query(Shipment).with_entities(
        func.avg(Shipment.risk_score)
    ).scalar() or 0

    alerts_24h = db.query(Alert).filter(
        Alert.created_at >= datetime.utcnow() - timedelta(hours=24)
    ).count()

    critical = db.query(Alert).filter(
        Alert.severity == RiskLevel.CRITICAL,
        Alert.is_acknowledged == False
    ).count()

    return KPIDashboard(
        total_shipments=total,
        active_shipments=active,
        on_time_percentage=round(on_time_pct, 1),
        delayed_shipments=delayed,
        at_risk_shipments=at_risk,
        avg_eta_accuracy=round(100 - avg_risk * 0.5, 1),
        avg_delay_probability=round(avg_risk, 1),
        active_disruptions=at_risk + delayed,
        total_alerts_24h=alerts_24h,
        critical_alerts=critical,
        cost_savings_optimization=round(random.uniform(10000, 50000), 2),
        trend_direction=random.choice(["up", "down", "stable"])
    )


@app.get("/api/v1/analytics/trends")
async def get_trends(
    metric: str = Query(..., pattern="^(delays|risk|volume|alerts)$"),
    period: str = Query("7d", pattern="^(24h|7d|30d|90d)$"),
    db: Session = Depends(get_db)
):
    days = {"24h": 1, "7d": 7, "30d": 30, "90d": 90}[period]
    data = []

    for i in range(days):
        timestamp = datetime.utcnow() - timedelta(days=days-i)
        value = random.uniform(20, 80)
        data.append({
            "timestamp": timestamp,
            "value": round(value, 2),
            "label": timestamp.strftime("%Y-%m-%d")
        })

    change = random.uniform(-20, 20)

    return TrendResponse(
        metric=metric,
        period=period,
        data=data,
        change_percentage=round(change, 1)
    )


@app.post("/api/v1/simulate")
async def run_simulation(scenario: SimulationScenario, db: Session = Depends(get_db)):
    affected_shipments = []

    query = db.query(Shipment).filter(
        Shipment.current_status == ShipmentStatus.IN_TRANSIT
    )

    if scenario.affected_region:
        affected = query.all()
        affected_shipments = [s.id for s in affected[:random.randint(3, 15)]]

    estimated_delay = scenario.delay_hours * (1.0 if scenario.severity == RiskLevel.CRITICAL else
                                               0.7 if scenario.severity == RiskLevel.HIGH else
                                               0.4 if scenario.severity == RiskLevel.MEDIUM else 0.2)

    actions = [
        "Review alternative routes immediately",
        "Notify affected customers",
        "Expedite customs documentation",
        "Consider partial shipment splits",
        "Activate contingency carrier agreements"
    ]

    return SimulationResult(
        scenario=scenario,
        impacted_shipments=affected_shipments,
        estimated_delay_increase=round(estimated_delay, 1),
        recommended_actions=actions[:3],
        cost_impact=round(len(affected_shipments) * scenario.delay_hours * 500, 2)
    )


@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat_assistant(request: ChatRequest, db: Session = Depends(get_db)):
    responses = {
        "risk": "Based on current analysis, shipments in the Singapore region are showing elevated risk due to port congestion. I recommend reviewing alternative routes for the next 48 hours.",
        "delay": "There are currently 12 shipments experiencing delays. The most critical are in the Asia-Pacific corridor. Would you like me to show you the affected shipments?",
        "route": "I can analyze optimal routes based on time, cost, or risk factors. Which criteria would you like to prioritize?",
        "help": "I can help you with: risk assessment, route optimization, delay predictions, and shipment tracking. What would you like to know?"
    }

    message_lower = request.message.lower()

    if any(word in message_lower for word in ["risk", "danger", "problem"]):
        content = responses["risk"]
        suggested = [{"action": "view_risk_map", "label": "View Risk Map"}, {"action": "optimize_routes", "label": "Optimize Routes"}]
    elif any(word in message_lower for word in ["delay", "late", "behind"]):
        content = responses["delay"]
        suggested = [{"action": "view_delays", "label": "View Delayed Shipments"}, {"action": "notify_customers", "label": "Notify Customers"}]
    elif any(word in message_lower for word in ["route", "path", "way"]):
        content = responses["route"]
        suggested = [{"action": "optimize_time", "label": "Optimize for Time"}, {"action": "optimize_cost", "label": "Optimize for Cost"}]
    else:
        content = responses["help"]
        suggested = [{"action": "view_dashboard", "label": "Open Dashboard"}, {"action": "create_report", "label": "Generate Report"}]

    return ChatResponse(
        message=content,
        conversation_id=request.conversation_id or str(random.randint(10000, 99999)),
        suggested_actions=suggested,
        relevant_shipments=request.shipment_context.split(",") if request.shipment_context else None,
        confidence=0.85
    )


@app.post("/api/v1/seed")
async def seed_demo_data(db: Session = Depends(get_db)):
    """Populate DB with realistic demo shipments for hackathon demo."""
    existing = db.query(Shipment).count()
    if existing >= 5:
        return {"message": f"Already have {existing} shipments", "seeded": 0}

    demo_shipments = [
        {"tracking_number": "SC-2024-001", "carrier": "Maersk Line", "transport_mode": TransportMode.SEA,
         "origin": {"name": "Shanghai, China", "latitude": 31.23, "longitude": 121.47, "country_code": "CN", "port_code": "SHA"},
         "destination": {"name": "Los Angeles, USA", "latitude": 34.05, "longitude": -118.24, "country_code": "US", "port_code": "LAX"},
         "cargo_type": "Electronics", "weight_kg": 25000, "value_usd": 2500000, "risk_score": 78, "risk_level": RiskLevel.HIGH,
         "current_status": ShipmentStatus.IN_TRANSIT},
        {"tracking_number": "SC-2024-002", "carrier": "DHL Aviation", "transport_mode": TransportMode.AIR,
         "origin": {"name": "Frankfurt, Germany", "latitude": 50.11, "longitude": 8.68, "country_code": "DE", "port_code": "FRA"},
         "destination": {"name": "New York, USA", "latitude": 40.71, "longitude": -74.01, "country_code": "US", "port_code": "NYC"},
         "cargo_type": "Pharmaceuticals", "weight_kg": 5000, "value_usd": 8000000, "risk_score": 22, "risk_level": RiskLevel.LOW,
         "current_status": ShipmentStatus.IN_TRANSIT},
        {"tracking_number": "SC-2024-003", "carrier": "Union Pacific", "transport_mode": TransportMode.RAIL,
         "origin": {"name": "Chicago, USA", "latitude": 41.88, "longitude": -87.63, "country_code": "US"},
         "destination": {"name": "Dallas, USA", "latitude": 32.78, "longitude": -96.80, "country_code": "US"},
         "cargo_type": "Automotive Parts", "weight_kg": 15000, "value_usd": 1200000, "risk_score": 55, "risk_level": RiskLevel.MEDIUM,
         "current_status": ShipmentStatus.DELAYED},
        {"tracking_number": "SC-2024-004", "carrier": "FedEx Freight", "transport_mode": TransportMode.TRUCK,
         "origin": {"name": "Detroit, USA", "latitude": 42.33, "longitude": -83.05, "country_code": "US"},
         "destination": {"name": "Toronto, Canada", "latitude": 43.65, "longitude": -79.38, "country_code": "CA"},
         "cargo_type": "Medical Supplies", "weight_kg": 2000, "value_usd": 500000, "risk_score": 92, "risk_level": RiskLevel.CRITICAL,
         "current_status": ShipmentStatus.AT_RISK},
        {"tracking_number": "SC-2024-005", "carrier": "COSCO Shipping", "transport_mode": TransportMode.SEA,
         "origin": {"name": "Singapore", "latitude": 1.35, "longitude": 103.82, "country_code": "SG", "port_code": "SIN"},
         "destination": {"name": "Rotterdam, Netherlands", "latitude": 51.92, "longitude": 4.48, "country_code": "NL", "port_code": "RTM"},
         "cargo_type": "Raw Materials", "weight_kg": 50000, "value_usd": 1800000, "risk_score": 45, "risk_level": RiskLevel.MEDIUM,
         "current_status": ShipmentStatus.REROUTED},
    ]

    count = 0
    for s_data in demo_shipments:
        exists = db.query(Shipment).filter(Shipment.tracking_number == s_data["tracking_number"]).first()
        if exists:
            continue
        ship = Shipment(
            tracking_number=s_data["tracking_number"], carrier=s_data["carrier"],
            transport_mode=s_data["transport_mode"], origin=s_data["origin"],
            destination=s_data["destination"],
            planned_eta=datetime.utcnow() + timedelta(days=random.randint(5, 20)),
            cargo_type=s_data.get("cargo_type"), weight_kg=s_data.get("weight_kg"),
            value_usd=s_data.get("value_usd"), risk_score=s_data.get("risk_score", 0),
            risk_level=s_data.get("risk_level", RiskLevel.LOW),
            current_status=s_data.get("current_status", ShipmentStatus.PENDING),
        )
        db.add(ship)
        count += 1
    db.commit()
    return {"message": f"Seeded {count} demo shipments", "seeded": count}


@app.get("/api/v1/predictions/disruptions", response_model=List[DisruptionPredictionResponse])
async def get_disruption_predictions(db: Session = Depends(get_db)):
    """AI-powered disruption predictions for at-risk shipments."""
    at_risk = db.query(Shipment).filter(
        Shipment.risk_score > 30,
        Shipment.current_status.in_([ShipmentStatus.IN_TRANSIT, ShipmentStatus.AT_RISK, ShipmentStatus.DELAYED])
    ).order_by(Shipment.risk_score.desc()).limit(10).all()

    predictions = []
    for ship in at_risk:
        factors = []
        actions = []
        if ship.risk_score > 70:
            factors.extend(["Severe weather", "Port congestion", "High traffic"])
            actions.extend(["Reroute to alternate port", "Expedite customs clearance", "Increase buffer time"])
        elif ship.risk_score > 50:
            factors.extend(["Moderate weather", "Border delay"])
            actions.extend(["Monitor situation", "Prepare contingency"])
        else:
            factors.extend(["Minor delays possible"])
            actions.extend(["Continue monitoring"])

        severity = RiskLevel.CRITICAL if ship.risk_score > 75 else RiskLevel.HIGH if ship.risk_score > 55 else RiskLevel.MEDIUM
        predictions.append(DisruptionPredictionResponse(
            shipmentId=ship.id, probability=min(ship.risk_score / 100 + random.uniform(-0.05, 0.05), 0.99),
            predictedDelay=round(ship.risk_score * 0.5 + random.uniform(-5, 10), 1),
            factors=factors, recommendedActions=actions, severity=severity
        ))

    if not predictions:
        predictions = [
            DisruptionPredictionResponse(
                shipmentId="demo-1", probability=0.85, predictedDelay=36,
                factors=["Severe weather", "Port congestion", "High traffic"],
                recommendedActions=["Reroute to alternate port", "Expedite customs clearance"],
                severity=RiskLevel.HIGH
            ),
            DisruptionPredictionResponse(
                shipmentId="demo-2", probability=0.92, predictedDelay=8,
                factors=["Border delay", "Customs inspection"],
                recommendedActions=["Pre-clear customs", "Use trusted trader program"],
                severity=RiskLevel.CRITICAL
            ),
        ]
    return predictions


@app.get("/api/v1/analytics/supply-chain-health", response_model=SupplyChainHealthResponse)
async def get_supply_chain_health(db: Session = Depends(get_db)):
    """Aggregate supply chain health score."""
    total = max(db.query(Shipment).count(), 1)
    at_risk_count = db.query(Shipment).filter(Shipment.risk_level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL])).count()
    avg_risk = db.query(Shipment).with_entities(func.avg(Shipment.risk_score)).scalar() or 25

    overall = max(0, min(100, 100 - avg_risk))
    resilience = max(0, min(100, 100 - (at_risk_count / total * 100)))

    return SupplyChainHealthResponse(
        overall_score=round(overall, 1),
        resilience_index=round(resilience, 1),
        disruption_probability=round(min(at_risk_count / total, 0.95), 2),
        active_threats=at_risk_count,
        mitigated_last_24h=random.randint(2, 8),
        top_risks=[
            {"type": "weather", "region": "Pacific", "severity": "high"},
            {"type": "congestion", "region": "LA/Long Beach", "severity": "medium"},
        ]
    )


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.append(websocket)

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "subscribe:shipments":
                await websocket.send_json({
                    "type": "subscribed",
                    "payload": {"channel": "shipments"}
                })
            elif data.get("type") == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat()
                })

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected normally.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if websocket in connected_websockets:
            connected_websockets.remove(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
