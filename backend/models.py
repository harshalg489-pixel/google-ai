from datetime import datetime, timedelta
from enum import Enum as PyEnum
from typing import List, Optional
from uuid import uuid4

from sqlalchemy import (
    Column, String, Float, DateTime, ForeignKey, JSON, Enum, Index, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship, Mapped, mapped_column

Base = declarative_base()


class ShipmentStatus(str, PyEnum):
    PENDING = "pending"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    DELAYED = "delayed"
    AT_RISK = "at_risk"
    REROUTED = "rerouted"


class RiskLevel(str, PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TransportMode(str, PyEnum):
    SEA = "sea"
    AIR = "air"
    RAIL = "rail"
    TRUCK = "truck"


class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    tracking_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    carrier: Mapped[str] = mapped_column(String(100), nullable=False)
    transport_mode: Mapped[TransportMode] = mapped_column(Enum(TransportMode), nullable=False)

    origin = Column(JSON, nullable=False)
    destination = Column(JSON, nullable=False)

    current_location = Column(JSON, nullable=True)
    current_status: Mapped[ShipmentStatus] = mapped_column(
        Enum(ShipmentStatus), default=ShipmentStatus.PENDING
    )

    planned_eta = Column(DateTime, nullable=False)
    actual_eta = Column(DateTime, nullable=True)

    cargo_type: Mapped[str] = mapped_column(String(100), nullable=True)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=True)
    value_usd: Mapped[float] = mapped_column(Float, nullable=True)

    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), default=RiskLevel.LOW)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    active_route_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("routes.id"), nullable=True)

    routes: Mapped[List["Route"]] = relationship("Route", back_populates="shipment", foreign_keys="Route.shipment_id")
    active_route: Mapped[Optional["Route"]] = relationship("Route", foreign_keys=[active_route_id])
    risk_events: Mapped[List["RiskEvent"]] = relationship("RiskEvent", back_populates="shipment")
    alerts: Mapped[List["Alert"]] = relationship("Alert", back_populates="shipment")

    __table_args__ = (
        Index("idx_shipment_status", "current_status"),
        Index("idx_shipment_risk_score", "risk_score"),
        Index("idx_shipment_eta", "planned_eta"),
    )


class Route(Base):
    __tablename__ = "routes"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    shipment_id: Mapped[str] = mapped_column(String(36), ForeignKey("shipments.id"), nullable=False)

    origin_port: Mapped[str] = mapped_column(String(100), nullable=False)
    destination_port: Mapped[str] = mapped_column(String(100), nullable=False)

    waypoints = Column(JSON, nullable=False, default=list)
    distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    estimated_duration_hours: Mapped[float] = mapped_column(Float, nullable=False)

    transport_mode: Mapped[TransportMode] = mapped_column(Enum(TransportMode), nullable=False)
    carrier: Mapped[str] = mapped_column(String(100), nullable=False)

    cost_usd: Mapped[float] = mapped_column(Float, nullable=True)
    fuel_cost_usd: Mapped[float] = mapped_column(Float, nullable=True)

    departure_time = Column(DateTime, nullable=True)
    arrival_time = Column(DateTime, nullable=True)

    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    is_alternative: Mapped[bool] = mapped_column(default=False)
    is_selected: Mapped[bool] = mapped_column(default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    shipment: Mapped["Shipment"] = relationship("Shipment", back_populates="routes", foreign_keys=[shipment_id])

    __table_args__ = (
        Index("idx_route_shipment", "shipment_id"),
    )


class RiskEvent(Base):
    __tablename__ = "risk_events"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    shipment_id: Mapped[str] = mapped_column(String(36), ForeignKey("shipments.id"), nullable=False)

    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), nullable=False)

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location_name: Mapped[str] = mapped_column(String(200), nullable=True)

    description: Mapped[str] = mapped_column(Text, nullable=False)
    impact_factor: Mapped[float] = mapped_column(Float, default=1.0)

    detected_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    estimated_delay_hours: Mapped[float] = mapped_column(Float, default=0.0)

    data_source = Column(JSON, nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.5)

    shipment: Mapped["Shipment"] = relationship("Shipment", back_populates="risk_events")

    __table_args__ = (
        Index("idx_risk_event_shipment", "shipment_id"),
        Index("idx_risk_event_location", "latitude", "longitude"),
        Index("idx_risk_event_detected", "detected_at"),
    )


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    shipment_id: Mapped[str] = mapped_column(String(36), ForeignKey("shipments.id"), nullable=False)

    alert_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    is_acknowledged: Mapped[bool] = mapped_column(default=False)
    acknowledged_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)

    recommended_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    auto_execute: Mapped[bool] = mapped_column(default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    shipment: Mapped["Shipment"] = relationship("Shipment", back_populates="alerts")

    __table_args__ = (
        Index("idx_alert_shipment", "shipment_id"),
        Index("idx_alert_acknowledged", "is_acknowledged"),
        Index("idx_alert_created", "created_at"),
    )


class WeatherData(Base):
    __tablename__ = "weather_data"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location_name: Mapped[str] = mapped_column(String(200), nullable=True)

    temperature_c: Mapped[float] = mapped_column(Float, nullable=True)
    wind_speed_kmh: Mapped[float] = mapped_column(Float, nullable=True)
    precipitation_mm: Mapped[float] = mapped_column(Float, default=0.0)
    visibility_km: Mapped[float] = mapped_column(Float, default=10.0)

    weather_condition: Mapped[str] = mapped_column(String(100), nullable=True)
    severity: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), default=RiskLevel.LOW)

    recorded_at = Column(DateTime, default=datetime.utcnow)
    forecast_for = Column(DateTime, nullable=False)

    data_source: Mapped[str] = mapped_column(String(50), default="api")

    __table_args__ = (
        Index("idx_weather_location", "latitude", "longitude"),
        Index("idx_weather_forecast", "forecast_for"),
    )


class HistoricalDelay(Base):
    __tablename__ = "historical_delays"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    route_id: Mapped[str] = mapped_column(String(36), ForeignKey("routes.id"), nullable=False)

    delay_hours: Mapped[float] = mapped_column(Float, nullable=False)
    delay_reason: Mapped[str] = mapped_column(String(100), nullable=True)
    weather_conditions: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    occurred_at = Column(DateTime, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    affected_shipment_count: Mapped[int] = mapped_column(default=1)
    financial_impact_usd: Mapped[float] = mapped_column(Float, nullable=True)

    __table_args__ = (
        Index("idx_delay_route", "route_id"),
        Index("idx_delay_occurred", "occurred_at"),
    )


class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )

    total_shipments: Mapped[int] = mapped_column(default=0)
    active_shipments: Mapped[int] = mapped_column(default=0)
    delayed_shipments: Mapped[int] = mapped_column(default=0)
    at_risk_shipments: Mapped[int] = mapped_column(default=0)

    avg_eta_accuracy: Mapped[float] = mapped_column(default=0.0)
    avg_delay_probability: Mapped[float] = mapped_column(default=0.0)
    active_disruptions: Mapped[int] = mapped_column(default=0)

    total_alerts_24h: Mapped[int] = mapped_column(default=0)
    critical_alerts: Mapped[int] = mapped_column(default=0)

    data = Column(JSON, nullable=True)

    recorded_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_analytics_recorded", "recorded_at"),
    )
