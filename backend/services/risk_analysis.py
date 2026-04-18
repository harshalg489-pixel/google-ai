from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import random
import math

from models import Shipment, RiskEvent, RiskLevel, WeatherData, HistoricalDelay, ShipmentStatus
from schemas import RiskAssessment, HeatmapPoint, Location


class RiskAnalysisService:
    def __init__(self, db_session):
        self.db = db_session
        self.weights = {
            'weather': 0.30,
            'congestion': 0.25,
            'operational': 0.20,
            'geopolitical': 0.15,
            'historical': 0.10
        }

    async def assess_shipment_risk(self, shipment: Shipment) -> RiskAssessment:
        weather_risk = await self._calculate_weather_risk(shipment)
        congestion_risk = await self._calculate_congestion_risk(shipment)
        operational_risk = await self._calculate_operational_risk(shipment)
        geopolitical_risk = await self._calculate_geopolitical_risk(shipment)
        historical_risk = await self._calculate_historical_risk(shipment)

        overall_score = (
            weather_risk * self.weights['weather'] +
            congestion_risk * self.weights['congestion'] +
            operational_risk * self.weights['operational'] +
            geopolitical_risk * self.weights['geopolitical'] +
            historical_risk * self.weights['historical']
        )

        risk_level = self._score_to_risk_level(overall_score)

        factors = await self._get_risk_factors(shipment)
        recommendations = self._generate_recommendations(
            overall_score, weather_risk, congestion_risk, operational_risk, factors
        )

        return RiskAssessment(
            shipment_id=shipment.id,
            overall_risk_score=round(overall_score, 2),
            risk_level=risk_level,
            weather_risk=round(weather_risk, 2),
            congestion_risk=round(congestion_risk, 2),
            operational_risk=round(operational_risk, 2),
            geopolitical_risk=round(geopolitical_risk, 2),
            historical_risk=round(historical_risk, 2),
            factors=factors,
            recommendations=recommendations
        )

    async def _calculate_weather_risk(self, shipment: Shipment) -> float:
        risk_score = 0.0
        route = shipment.active_route

        if not route or not route.waypoints:
            return random.uniform(5, 20)

        for waypoint in route.waypoints:
            if hasattr(waypoint, 'latitude') and hasattr(waypoint, 'longitude'):
                weather = await self._get_weather_at_location(
                    waypoint.latitude, waypoint.longitude
                )
                if weather:
                    if weather.severity == RiskLevel.CRITICAL:
                        risk_score += 25
                    elif weather.severity == RiskLevel.HIGH:
                        risk_score += 15
                    elif weather.severity == RiskLevel.MEDIUM:
                        risk_score += 8
                    else:
                        risk_score += 2

        return min(risk_score / max(len(route.waypoints), 1), 100)

    async def _calculate_congestion_risk(self, shipment: Shipment) -> float:
        if shipment.transport_mode.value == 'sea':
            return self._calculate_port_congestion(shipment)
        elif shipment.transport_mode.value == 'air':
            return self._calculate_airport_congestion(shipment)
        else:
            return self._calculate_road_rail_congestion(shipment)

    def _calculate_port_congestion(self, shipment: Shipment) -> float:
        high_congestion_ports = ['SIN', 'LAX', 'LGB', 'NYC']
        origin_port = shipment.origin.get('port_code', '')
        dest_port = shipment.destination.get('port_code', '')

        base_score = random.uniform(10, 40)

        if origin_port in high_congestion_ports or dest_port in high_congestion_ports:
            base_score += random.uniform(20, 40)

        return min(base_score, 100)

    def _calculate_airport_congestion(self, shipment: Shipment) -> float:
        return random.uniform(5, 30)

    def _calculate_road_rail_congestion(self, shipment: Shipment) -> float:
        return random.uniform(10, 35)

    async def _calculate_operational_risk(self, shipment: Shipment) -> float:
        carrier_reliability = self._get_carrier_reliability(shipment.carrier)
        equipment_factor = random.uniform(0.8, 1.2)

        base_risk = (100 - carrier_reliability) * equipment_factor

        if shipment.current_status == ShipmentStatus.DELAYED:
            base_risk += 15
        elif shipment.current_status == ShipmentStatus.AT_RISK:
            base_risk += 10

        return min(max(base_risk, 0), 100)

    def _get_carrier_reliability(self, carrier: str) -> float:
        reliability_map = {
            'maersk': 92, 'msc': 88, 'cma-cgm': 85, 'evergreen': 83,
            'hapag-lloyd': 87, 'one': 84, 'cosco': 86, 'apm': 89,
            'dhl': 91, 'fedex': 89, 'ups': 90
        }
        return reliability_map.get(carrier.lower(), random.uniform(70, 85))

    async def _calculate_geopolitical_risk(self, shipment: Shipment) -> float:
        origin_country = shipment.origin.get('country_code', '')
        dest_country = shipment.destination.get('country_code', '')

        high_risk_countries = ['IR', 'RU', 'BY', 'VE', 'AF', 'SY', 'KP']
        medium_risk_countries = ['CN', 'IN', 'BR', 'ZA', 'MX', 'TR']

        if origin_country in high_risk_countries or dest_country in high_risk_countries:
            return random.uniform(60, 95)
        elif origin_country in medium_risk_countries or dest_country in medium_risk_countries:
            return random.uniform(25, 55)

        return random.uniform(5, 25)

    async def _calculate_historical_risk(self, shipment: Shipment) -> float:
        route = shipment.active_route
        if not route:
            return random.uniform(10, 30)

        historical_delays = self.db.query(HistoricalDelay).filter(
            HistoricalDelay.route_id == route.id
        ).all()

        if not historical_delays:
            return random.uniform(10, 25)

        total_delays = len(historical_delays)
        avg_delay_hours = sum(d.delay_hours for d in historical_delays) / total_delays

        base_score = min(avg_delay_hours * 5, 70)
        frequency_factor = min(total_delays * 3, 30)

        return min(base_score + frequency_factor, 100)

    async def _get_weather_at_location(self, lat: float, lon: float) -> Optional[WeatherData]:
        weather = self.db.query(WeatherData).filter(
            WeatherData.latitude.between(lat - 1, lat + 1),
            WeatherData.longitude.between(lon - 1, lon + 1),
            WeatherData.forecast_for >= datetime.utcnow()
        ).first()

        if not weather:
            weather = self._generate_mock_weather(lat, lon)

        return weather

    def _generate_mock_weather(self, lat: float, lon: float) -> WeatherData:
        conditions = [
            ('Clear', RiskLevel.LOW, 0, 10),
            ('Cloudy', RiskLevel.LOW, 0, 15),
            ('Rain', RiskLevel.MEDIUM, 10, 25),
            ('Storm', RiskLevel.HIGH, 20, 60),
            ('Severe Storm', RiskLevel.CRITICAL, 50, 100),
            ('Fog', RiskLevel.MEDIUM, 5, 20)
        ]

        condition, severity, min_wind, max_wind = random.choice(conditions)

        return WeatherData(
            id=str(random.randint(10000, 99999)),
            latitude=lat,
            longitude=lon,
            temperature_c=random.uniform(-10, 35),
            wind_speed_kmh=random.uniform(min_wind, max_wind),
            precipitation_mm=random.uniform(0, 50) if severity.value in ['medium', 'high', 'critical'] else 0,
            visibility_km=random.uniform(1, 10),
            weather_condition=condition,
            severity=severity,
            forecast_for=datetime.utcnow() + timedelta(hours=24)
        )

    def _score_to_risk_level(self, score: float) -> RiskLevel:
        if score >= 75:
            return RiskLevel.CRITICAL
        elif score >= 55:
            return RiskLevel.HIGH
        elif score >= 35:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    async def _get_risk_factors(self, shipment: Shipment) -> List[Dict[str, Any]]:
        factors = []
        route = shipment.active_route

        if route:
            for i, waypoint in enumerate(route.waypoints):
                if random.random() > 0.7:
                    factors.append({
                        'location': getattr(waypoint, 'name', f'Waypoint {i}'),
                        'factor_type': random.choice(['weather', 'congestion', 'operational']),
                        'severity': random.choice(['low', 'medium', 'high']),
                        'description': f'Risk detected at {getattr(waypoint, "name", f"waypoint {i}")}'
                    })

        if shipment.current_status == ShipmentStatus.DELAYED:
            factors.append({
                'location': 'Current',
                'factor_type': 'operational',
                'severity': 'high',
                'description': 'Shipment already experiencing delays'
            })

        return factors

    def _generate_recommendations(self, overall_score: float, weather_risk: float,
                                  congestion_risk: float, operational_risk: float,
                                  factors: List[Dict]) -> List[str]:
        recommendations = []

        if overall_score >= 75:
            recommendations.append("Consider immediate rerouting to alternative path")
            recommendations.append("Notify stakeholders of potential significant delay")
        elif overall_score >= 55:
            recommendations.append("Monitor situation closely and prepare contingency plans")
            recommendations.append("Review alternative routes as backup")

        if weather_risk > 50:
            recommendations.append("Weather-related delays likely - consider weather routing")

        if congestion_risk > 50:
            recommendations.append("Port congestion anticipated - expedite documentation")

        if operational_risk > 50:
            recommendations.append("Review carrier contingency plans")

        if not recommendations:
            recommendations.append("Current route appears optimal - continue monitoring")

        return recommendations

    async def generate_risk_heatmap(self, bounds: Optional[Dict] = None) -> List[HeatmapPoint]:
        points = []

        risk_zones = [
            {'lat': 1.29, 'lon': 103.85, 'name': 'Singapore Strait', 'base_risk': 0.7},
            {'lat': 51.92, 'lon': 4.48, 'name': 'Rotterdam', 'base_risk': 0.5},
            {'lat': 33.75, 'lon': -118.24, 'name': 'Los Angeles', 'base_risk': 0.8},
            {'lat': 40.68, 'lon': -74.04, 'name': 'New York', 'base_risk': 0.6},
            {'lat': 25.27, 'lon': 121.65, 'name': 'Taiwan Strait', 'base_risk': 0.5},
            {'lat': 29.95, 'lon': -90.07, 'name': 'Gulf of Mexico', 'base_risk': 0.6},
            {'lat': 35.68, 'lon': 139.76, 'name': 'Tokyo Bay', 'base_risk': 0.4},
        ]

        for zone in risk_zones:
            points.append(HeatmapPoint(
                latitude=zone['lat'] + random.uniform(-0.5, 0.5),
                longitude=zone['lon'] + random.uniform(-0.5, 0.5),
                intensity=min(zone['base_risk'] + random.uniform(-0.2, 0.2), 1.0),
                risk_level=self._score_to_risk_level(zone['base_risk'] * 100),
                factor=random.choice(['congestion', 'weather', 'geopolitical']),
                description=f"{zone['name']} - Elevated risk detected"
            ))

        if bounds:
            points = [p for p in points if
                     bounds['min_lat'] <= p.latitude <= bounds['max_lat'] and
                     bounds['min_lon'] <= p.longitude <= bounds['max_lon']]

        return points

    async def detect_anomalies(self, time_window: int = 24) -> List[Dict[str, Any]]:
        since = datetime.utcnow() - timedelta(hours=time_window)

        recent_risks = self.db.query(RiskEvent).filter(
            RiskEvent.detected_at >= since
        ).all()

        anomalies = []

        for risk in recent_risks:
            if risk.confidence_score > 0.7 and risk.severity.value in ['high', 'critical']:
                anomalies.append({
                    'type': 'risk_spike',
                    'location': risk.location_name,
                    'severity': risk.severity.value,
                    'description': risk.description,
                    'detected_at': risk.detected_at,
                    'affected_shipments': [risk.shipment_id]
                })

        return anomalies
