from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import random

from models import Alert, Shipment, RiskLevel, ShipmentStatus
from schemas import AlertCreate, AlertResponse


class AlertsService:
    def __init__(self, db_session):
        self.db = db_session

    async def generate_alert(self, shipment: Shipment, risk_score: float,
                            risk_factors: List[Dict[str, Any]]) -> Optional[Alert]:
        if risk_score < 35:
            return None

        risk_level = self._score_to_risk_level(risk_score)
        alert_type, title, message = self._generate_alert_content(
            shipment, risk_score, risk_factors, risk_level
        )

        recommended_action = self._generate_recommended_action(
            shipment, risk_level, risk_factors
        )

        expires_at = datetime.utcnow() + timedelta(hours=24 if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL] else 72)

        alert = Alert(
            shipment_id=shipment.id,
            alert_type=alert_type,
            severity=risk_level,
            title=title,
            message=message,
            recommended_action=recommended_action,
            auto_execute=risk_level == RiskLevel.CRITICAL,
            expires_at=expires_at
        )

        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)

        return alert

    def _score_to_risk_level(self, score: float) -> RiskLevel:
        if score >= 75:
            return RiskLevel.CRITICAL
        elif score >= 55:
            return RiskLevel.HIGH
        elif score >= 35:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    def _generate_alert_content(self, shipment: Shipment, risk_score: float,
                               risk_factors: List[Dict[str, Any]],
                               risk_level: RiskLevel) -> tuple:
        origin = shipment.origin.get('name', 'Unknown')
        dest = shipment.destination.get('name', 'Unknown')

        factor_types = [f.get('factor_type', 'unknown') for f in risk_factors]

        if 'weather' in factor_types:
            alert_type = 'weather_risk'
            title = f"⚠️ Weather Risk Detected - {shipment.tracking_number}"
            message = f"Severe weather conditions detected along route from {origin} to {dest}. Risk score: {risk_score:.0f}/100."

        elif 'congestion' in factor_types:
            alert_type = 'congestion_risk'
            title = f"⚠️ Port Congestion Alert - {shipment.tracking_number}"
            port = risk_factors[0].get('location', 'destination')
            message = f"High congestion expected at {port} for shipment {shipment.tracking_number} ({origin} → {dest})."

        elif 'geopolitical' in factor_types:
            alert_type = 'geopolitical_risk'
            title = f"⚠️ Geopolitical Risk - {shipment.tracking_number}"
            message = f"Elevated geopolitical risk detected for route from {origin} to {dest}."

        elif shipment.current_status == ShipmentStatus.DELAYED:
            alert_type = 'delay_alert'
            title = f"🚨 Delay Alert - {shipment.tracking_number}"
            message = f"Shipment {shipment.tracking_number} from {origin} to {dest} is experiencing delays."

        else:
            alert_type = 'risk_warning'
            title = f"Risk Warning - {shipment.tracking_number}"
            message = f"Risk level {risk_level.value} detected for shipment {shipment.tracking_number} ({origin} → {dest})."

        return alert_type, title, message

    def _generate_recommended_action(self, shipment: Shipment,
                                    risk_level: RiskLevel,
                                    risk_factors: List[Dict[str, Any]]) -> str:
        if risk_level == RiskLevel.CRITICAL:
            return "Immediate rerouting recommended. Notify all stakeholders and activate contingency plan."
        elif risk_level == RiskLevel.HIGH:
            return "Review alternative routes and prepare for potential delays. Expedite customs documentation."

        factor_types = [f.get('factor_type', 'unknown') for f in risk_factors]

        if 'weather' in factor_types:
            return "Monitor weather forecasts and consider weather routing options."
        elif 'congestion' in factor_types:
            return "Expedite port documentation and consider transhipment alternatives."
        elif 'operational' in factor_types:
            return "Contact carrier for updated ETAs and backup capacity."

        return "Continue monitoring. No immediate action required."

    async def get_active_alerts(self, shipment_id: Optional[str] = None,
                               severity: Optional[List[RiskLevel]] = None,
                               limit: int = 50) -> List[Alert]:
        query = self.db.query(Alert).filter(
            Alert.is_acknowledged == False,
            Alert.expires_at > datetime.utcnow()
        )

        if shipment_id:
            query = query.filter(Alert.shipment_id == shipment_id)

        if severity:
            query = query.filter(Alert.severity.in_(severity))

        return query.order_by(Alert.created_at.desc()).limit(limit).all()

    async def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> Alert:
        alert = self.db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            raise ValueError(f"Alert {alert_id} not found")

        alert.is_acknowledged = True
        alert.acknowledged_by = acknowledged_by
        alert.acknowledged_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(alert)

        return alert

    async def get_alert_stats(self) -> Dict[str, Any]:
        total = self.db.query(Alert).count()
        active = self.db.query(Alert).filter(
            Alert.is_acknowledged == False,
            Alert.expires_at > datetime.utcnow()
        ).count()

        critical = self.db.query(Alert).filter(
            Alert.severity == RiskLevel.CRITICAL,
            Alert.is_acknowledged == False
        ).count()

        high = self.db.query(Alert).filter(
            Alert.severity == RiskLevel.HIGH,
            Alert.is_acknowledged == False
        ).count()

        last_24h = self.db.query(Alert).filter(
            Alert.created_at >= datetime.utcnow() - timedelta(hours=24)
        ).count()

        return {
            'total_alerts': total,
            'active_alerts': active,
            'critical_count': critical,
            'high_count': high,
            'alerts_24h': last_24h
        }

    async def generate_system_alerts(self) -> List[Alert]:
        system_alerts = []

        if random.random() < 0.1:
            alert = Alert(
                shipment_id=None,
                alert_type='system_maintenance',
                severity=RiskLevel.LOW,
                title='Scheduled Maintenance',
                message='System maintenance scheduled for tonight 02:00-04:00 UTC.',
                recommended_action='No action needed.',
                expires_at=datetime.utcnow() + timedelta(hours=12)
            )
            self.db.add(alert)
            system_alerts.append(alert)

        self.db.commit()
        return system_alerts
