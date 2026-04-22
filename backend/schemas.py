from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class ShipmentStatus(str, Enum):
    PENDING = "pending"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    DELAYED = "delayed"
    AT_RISK = "at_risk"
    REROUTED = "rerouted"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TransportMode(str, Enum):
    SEA = "sea"
    AIR = "air"
    RAIL = "rail"
    TRUCK = "truck"


class Location(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    name: str
    country_code: Optional[str] = None
    port_code: Optional[str] = None


class RouteWaypoint(BaseModel):
    latitude: float
    longitude: float
    name: str
    eta: datetime
    risk_level: RiskLevel = RiskLevel.LOW


class RouteBase(BaseModel):
    origin_port: str
    destination_port: str
    waypoints: List[RouteWaypoint]
    distance_km: float
    estimated_duration_hours: float
    transport_mode: TransportMode
    carrier: str
    cost_usd: Optional[float] = None
    fuel_cost_usd: Optional[float] = None
    risk_score: float = Field(default=0.0, ge=0, le=100)


class RouteCreate(RouteBase):
    pass


class RouteResponse(RouteBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    shipment_id: str
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    is_alternative: bool = False
    is_selected: bool = False
    created_at: datetime


class RiskEventBase(BaseModel):
    event_type: str
    severity: RiskLevel
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    description: str
    impact_factor: float = Field(default=1.0, ge=0, le=2.0)
    estimated_delay_hours: float = Field(default=0.0, ge=0)
    confidence_score: float = Field(default=0.5, ge=0, le=1.0)
    data_source: Optional[Dict[str, Any]] = None


class RiskEventCreate(RiskEventBase):
    shipment_id: str


class RiskEventResponse(RiskEventBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    shipment_id: str
    detected_at: datetime
    resolved_at: Optional[datetime] = None


class AlertBase(BaseModel):
    alert_type: str
    severity: RiskLevel
    title: str
    message: str
    recommended_action: Optional[str] = None
    auto_execute: bool = False
    expires_at: Optional[datetime] = None


class AlertCreate(AlertBase):
    shipment_id: str


class AlertResponse(AlertBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    shipment_id: Optional[str] = None
    is_acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    created_at: datetime


class ShipmentBase(BaseModel):
    tracking_number: str
    carrier: str
    transport_mode: TransportMode
    origin: Location
    destination: Location
    planned_eta: datetime
    cargo_type: Optional[str] = None
    weight_kg: Optional[float] = None
    value_usd: Optional[float] = None


class ShipmentCreate(ShipmentBase):
    pass


class ShipmentUpdate(BaseModel):
    current_status: Optional[ShipmentStatus] = None
    current_location: Optional[Location] = None
    actual_eta: Optional[datetime] = None
    risk_score: Optional[float] = None
    risk_level: Optional[RiskLevel] = None


class ShipmentResponse(ShipmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    current_status: ShipmentStatus
    current_location: Optional[Location] = None
    actual_eta: Optional[datetime] = None
    risk_score: float
    risk_level: RiskLevel
    active_route_id: Optional[str] = None
    active_route: Optional[RouteResponse] = None
    routes: List[RouteResponse] = []
    risk_events: List[RiskEventResponse] = []
    alerts: List[AlertResponse] = []
    created_at: datetime
    updated_at: datetime


class ShipmentListResponse(BaseModel):
    id: str
    tracking_number: str
    carrier: str
    transport_mode: TransportMode
    current_status: ShipmentStatus
    risk_score: float
    risk_level: RiskLevel
    planned_eta: datetime
    origin_name: str
    destination_name: str
    origin_lat: float
    origin_lon: float
    destination_lat: float
    destination_lon: float


class RiskAssessment(BaseModel):
    shipment_id: str
    overall_risk_score: float = Field(..., ge=0, le=100)
    risk_level: RiskLevel
    weather_risk: float = Field(..., ge=0, le=100)
    congestion_risk: float = Field(..., ge=0, le=100)
    operational_risk: float = Field(..., ge=0, le=100)
    geopolitical_risk: float = Field(..., ge=0, le=100)
    historical_risk: float = Field(..., ge=0, le=100)
    factors: List[Dict[str, Any]]
    recommendations: List[str]
    assessed_at: datetime = Field(default_factory=datetime.utcnow)


class HeatmapPoint(BaseModel):
    latitude: float
    longitude: float
    intensity: float = Field(..., ge=0, le=1)
    risk_level: RiskLevel
    factor: str
    description: str


class RouteOptimizationRequest(BaseModel):
    shipment_id: str
    origin: Location
    destination: Location
    transport_modes: List[TransportMode] = Field(default_factory=lambda: [TransportMode.SEA])
    optimize_for: str = Field(default="balanced", pattern="^(time|cost|risk|balanced)$")
    departure_time: Optional[datetime] = None


class RouteComparison(BaseModel):
    route: RouteResponse
    eta: datetime
    total_cost: float
    risk_score: float
    savings_vs_current: Dict[str, float]


class RouteOptimizationResponse(BaseModel):
    current_route: Optional[RouteResponse]
    alternatives: List[RouteComparison]
    recommended_route_id: str
    reasoning: str


class RerouteRequest(BaseModel):
    new_route_id: str
    reason: str
    notify_stakeholders: bool = True


class KPIDashboard(BaseModel):
    total_shipments: int
    active_shipments: int
    on_time_percentage: float
    delayed_shipments: int
    at_risk_shipments: int
    avg_eta_accuracy: float
    avg_delay_probability: float
    active_disruptions: int
    total_alerts_24h: int
    critical_alerts: int
    cost_savings_optimization: float
    trend_direction: str = Field(pattern="^(up|down|stable)$")


class TrendDataPoint(BaseModel):
    timestamp: datetime
    value: float
    label: str


class TrendResponse(BaseModel):
    metric: str
    period: str
    data: List[TrendDataPoint]
    change_percentage: float


class ForecastPoint(BaseModel):
    timestamp: datetime
    predicted_value: float
    confidence_lower: float
    confidence_upper: float


class ForecastResponse(BaseModel):
    metric: str
    horizon_days: int
    predictions: List[ForecastPoint]
    model_accuracy: float


class SimulationScenario(BaseModel):
    scenario_type: str
    severity: RiskLevel
    affected_region: Optional[Dict[str, Any]] = None
    delay_hours: float = 0.0
    description: str


class SimulationResult(BaseModel):
    scenario: SimulationScenario
    impacted_shipments: List[str]
    estimated_delay_increase: float
    recommended_actions: List[str]
    cost_impact: float


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    context: Optional[Dict[str, Any]] = None


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    shipment_context: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    conversation_id: str
    suggested_actions: Optional[List[Dict[str, Any]]] = None
    relevant_shipments: Optional[List[str]] = None
    confidence: float = Field(default=0.8, ge=0, le=1)


class WebSocketMessage(BaseModel):
    type: str
    payload: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    pageSize: int
    total_pages: int


class ShipmentFilter(BaseModel):
    status: Optional[List[ShipmentStatus]] = None
    risk_level: Optional[List[RiskLevel]] = None
    transport_mode: Optional[List[TransportMode]] = None
    carrier: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_risk_score: Optional[float] = None
    max_risk_score: Optional[float] = None
