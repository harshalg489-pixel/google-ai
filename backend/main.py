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
    ShipmentFilter, PaginatedResponse, WebSocketMessage, HeatmapPoint
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
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
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
