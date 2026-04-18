from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import random
import math

from models import Shipment, Route, TransportMode, RiskLevel
from schemas import (
    RouteOptimizationRequest, RouteOptimizationResponse, RouteComparison,
    RouteWaypoint, RerouteRequest, Location
)


class RoutingService:
    def __init__(self, db_session):
        self.db = db_session

        self.major_ports = {
            'sea': [
                {'code': 'SIN', 'name': 'Singapore', 'lat': 1.29, 'lon': 103.85, 'congestion': 0.7},
                {'code': 'SHA', 'name': 'Shanghai', 'lat': 31.23, 'lon': 121.47, 'congestion': 0.6},
                {'code': 'NGB', 'name': 'Ningbo', 'lat': 29.86, 'lon': 121.57, 'congestion': 0.5},
                {'code': 'SZX', 'name': 'Shenzhen', 'lat': 22.54, 'lon': 114.06, 'congestion': 0.55},
                {'code': 'HKG', 'name': 'Hong Kong', 'lat': 22.32, 'lon': 114.17, 'congestion': 0.5},
                {'code': 'LAX', 'name': 'Los Angeles', 'lat': 33.73, 'lon': -118.26, 'congestion': 0.8},
                {'code': 'LGB', 'name': 'Long Beach', 'lat': 33.75, 'lon': -118.19, 'congestion': 0.75},
                {'code': 'NYC', 'name': 'New York', 'lat': 40.68, 'lon': -74.04, 'congestion': 0.65},
                {'code': 'RTM', 'name': 'Rotterdam', 'lat': 51.92, 'lon': 4.48, 'congestion': 0.5},
                {'code': 'HAM', 'name': 'Hamburg', 'lat': 53.55, 'lon': 9.99, 'congestion': 0.45},
                {'code': 'ANR', 'name': 'Antwerp', 'lat': 51.22, 'lon': 4.40, 'congestion': 0.5},
                {'code': 'DXB', 'name': 'Jebel Ali', 'lat': 24.99, 'lon': 55.06, 'congestion': 0.4},
                {'code': 'BKK', 'name': 'Laem Chabang', 'lat': 13.08, 'lon': 100.88, 'congestion': 0.45},
                {'code': 'TYO', 'name': 'Tokyo', 'lat': 35.65, 'lon': 139.79, 'congestion': 0.4},
                {'code': 'PUS', 'name': 'Busan', 'lat': 35.10, 'lon': 129.04, 'congestion': 0.45},
            ],
            'air': [
                {'code': 'HKG', 'name': 'Hong Kong International', 'lat': 22.31, 'lon': 113.94, 'congestion': 0.5},
                {'code': 'MEM', 'name': 'Memphis', 'lat': 35.21, 'lon': -89.98, 'congestion': 0.45},
                {'code': 'PVG', 'name': 'Shanghai Pudong', 'lat': 31.14, 'lon': 121.81, 'congestion': 0.55},
                {'code': 'ICN', 'name': 'Incheon', 'lat': 37.46, 'lon': 126.44, 'congestion': 0.4},
                {'code': 'ANC', 'name': 'Anchorage', 'lat': 61.17, 'lon': -149.99, 'congestion': 0.3},
                {'code': 'DXB', 'name': 'Dubai', 'lat': 25.25, 'lon': 55.36, 'congestion': 0.5},
                {'code': 'LAX', 'name': 'LAX', 'lat': 33.94, 'lon': -118.41, 'congestion': 0.6},
                {'code': 'FRA', 'name': 'Frankfurt', 'lat': 50.04, 'lon': 8.57, 'congestion': 0.5},
                {'code': 'CDG', 'name': 'Paris CDG', 'lat': 49.01, 'lon': 2.55, 'congestion': 0.45},
            ]
        }

        self.carriers = {
            'sea': ['Maersk', 'MSC', 'CMA CGM', 'Evergreen', 'Hapag-Lloyd', 'ONE', 'Cosco'],
            'air': ['DHL', 'FedEx', 'UPS', 'Emirates SkyCargo', 'Lufthansa Cargo'],
            'rail': ['DB Schenker', 'Rail Cargo Austria', 'SNCF'],
            'truck': ['DHL Freight', 'Kuehne+Nagel', 'DB Schenker']
        }

    async def optimize_route(self, request: RouteOptimizationRequest) -> RouteOptimizationResponse:
        shipment = self.db.query(Shipment).filter(Shipment.id == request.shipment_id).first()

        current_route = shipment.active_route if shipment else None

        alternatives = []

        for mode in request.transport_modes:
            mode_alternatives = await self._generate_route_alternatives(
                request.origin, request.destination, mode, request.optimize_for
            )

            for route_data in mode_alternatives:
                route = Route(**route_data)
                comparison = RouteComparison(
                    route=self._route_to_response(route),
                    eta=self._calculate_eta(route, request.departure_time or datetime.utcnow()),
                    total_cost=self._calculate_total_cost(route),
                    risk_score=route.risk_score,
                    savings_vs_current=self._calculate_savings(route, current_route)
                )
                alternatives.append(comparison)

        alternatives.sort(key=lambda x: self._score_route(x, request.optimize_for), reverse=True)

        best_alternative = alternatives[0] if alternatives else None
        recommended_route_id = best_alternative.route.id if best_alternative else current_route.id if current_route else None

        reasoning = self._generate_reasoning(best_alternative, request.optimize_for)

        return RouteOptimizationResponse(
            current_route=self._route_to_response(current_route) if current_route else None,
            alternatives=alternatives[:5],
            recommended_route_id=recommended_route_id,
            reasoning=reasoning
        )

    async def _generate_route_alternatives(self, origin: Location, destination: Location,
                                           mode: TransportMode, optimize_for: str) -> List[Dict]:
        alternatives = []
        mode_str = mode.value

        if mode_str in ['sea', 'air']:
            ports = self.major_ports.get(mode_str, [])
            origin_port = self._find_nearest_port(origin, ports)
            dest_port = self._find_nearest_port(destination, ports)

            if not origin_port or not dest_port:
                return alternatives

            direct_route = await self._create_route(
                origin_port, dest_port, mode, [], optimize_for
            )
            if direct_route:
                alternatives.append(direct_route)

            if mode_str == 'sea':
                via_ports = self._get_transhipment_options(origin_port, dest_port)
                for via in via_ports[:2]:
                    multi_route = await self._create_route(
                        origin_port, dest_port, mode, [via], optimize_for
                    )
                    if multi_route:
                        alternatives.append(multi_route)

        else:
            direct_route = await self._create_direct_route(origin, destination, mode, optimize_for)
            if direct_route:
                alternatives.append(direct_route)

        return alternatives

    def _find_nearest_port(self, location: Location, ports: List[Dict]) -> Optional[Dict]:
        min_dist = float('inf')
        nearest = None

        for port in ports:
            dist = self._haversine_distance(
                location.latitude, location.longitude,
                port['lat'], port['lon']
            )
            if dist < min_dist:
                min_dist = dist
                nearest = port

        return nearest

    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))

        return R * c

    def _get_transhipment_options(self, origin: Dict, dest: Dict) -> List[Dict]:
        all_ports = self.major_ports['sea']
        options = []

        for port in all_ports:
            if port['code'] not in [origin['code'], dest['code']]:
                dist_from_origin = self._haversine_distance(
                    origin['lat'], origin['lon'], port['lat'], port['lon']
                )
                dist_to_dest = self._haversine_distance(
                    port['lat'], port['lon'], dest['lat'], dest['lon']
                )

                if dist_from_origin > 500 and dist_to_dest > 500:
                    options.append(port)

        options.sort(key=lambda p: p['congestion'])
        return options[:3]

    async def _create_route(self, origin: Dict, dest: Dict, mode: TransportMode,
                           via: List[Dict], optimize_for: str) -> Optional[Dict]:
        waypoints_list = [origin]
        waypoints_list.extend(via)
        waypoints_list.append(dest)

        total_distance = 0
        for i in range(len(waypoints_list) - 1):
            total_distance += self._haversine_distance(
                waypoints_list[i]['lat'], waypoints_list[i]['lon'],
                waypoints_list[i+1]['lat'], waypoints_list[i+1]['lon']
            )

        speed_kmh = {'sea': 37, 'air': 900, 'rail': 60, 'truck': 80}[mode.value]
        duration_hours = total_distance / speed_kmh

        congestion_factor = sum(p.get('congestion', 0.5) for p in waypoints_list) / len(waypoints_list)

        base_cost_per_km = {'sea': 0.015, 'air': 3.5, 'rail': 0.08, 'truck': 0.12}[mode.value]
        cost_usd = total_distance * base_cost_per_km * (1 + congestion_factor * 0.3)
        fuel_cost = cost_usd * 0.4

        risk_score = self._calculate_route_risk(waypoints_list, mode)

        if optimize_for == 'time':
            duration_hours *= 0.85
        elif optimize_for == 'cost':
            cost_usd *= 0.9
        elif optimize_for == 'risk':
            risk_score *= 0.7

        route_waypoints = []
        for i, wp in enumerate(waypoints_list):
            eta = datetime.utcnow() + timedelta(hours=duration_hours * (i / len(waypoints_list)))
            route_waypoints.append({
                'latitude': wp['lat'],
                'longitude': wp['lon'],
                'name': wp['name'],
                'eta': eta,
                'risk_level': RiskLevel.MEDIUM if wp.get('congestion', 0.5) > 0.6 else RiskLevel.LOW
            })

        return {
            'id': str(random.randint(100000, 999999)),
            'shipment_id': 'temp',
            'origin_port': origin['name'],
            'destination_port': dest['name'],
            'waypoints': route_waypoints,
            'distance_km': round(total_distance, 2),
            'estimated_duration_hours': round(duration_hours, 2),
            'transport_mode': mode,
            'carrier': random.choice(self.carriers.get(mode.value, ['Unknown'])),
            'cost_usd': round(cost_usd, 2),
            'fuel_cost_usd': round(fuel_cost, 2),
            'risk_score': round(risk_score, 2),
            'is_alternative': True,
            'is_selected': False,
            'created_at': datetime.utcnow()
        }

    async def _create_direct_route(self, origin: Location, destination: Location,
                                   mode: TransportMode, optimize_for: str) -> Optional[Dict]:
        distance = self._haversine_distance(
            origin.latitude, origin.longitude,
            destination.latitude, destination.longitude
        )

        speed_kmh = {'rail': 60, 'truck': 80}[mode.value]
        duration_hours = distance / speed_kmh

        base_cost_per_km = {'rail': 0.08, 'truck': 0.12}[mode.value]
        cost_usd = distance * base_cost_per_km

        return {
            'id': str(random.randint(100000, 999999)),
            'shipment_id': 'temp',
            'origin_port': origin.name,
            'destination_port': destination.name,
            'waypoints': [
                {
                    'latitude': origin.latitude,
                    'longitude': origin.longitude,
                    'name': origin.name,
                    'eta': datetime.utcnow(),
                    'risk_level': RiskLevel.LOW
                },
                {
                    'latitude': destination.latitude,
                    'longitude': destination.longitude,
                    'name': destination.name,
                    'eta': datetime.utcnow() + timedelta(hours=duration_hours),
                    'risk_level': RiskLevel.LOW
                }
            ],
            'distance_km': round(distance, 2),
            'estimated_duration_hours': round(duration_hours, 2),
            'transport_mode': mode,
            'carrier': random.choice(self.carriers.get(mode.value, ['Unknown'])),
            'cost_usd': round(cost_usd, 2),
            'fuel_cost_usd': round(cost_usd * 0.35, 2),
            'risk_score': round(random.uniform(15, 45), 2),
            'is_alternative': True,
            'is_selected': False,
            'created_at': datetime.utcnow()
        }

    def _calculate_route_risk(self, waypoints: List[Dict], mode: TransportMode) -> float:
        base_risk = 20.0

        for wp in waypoints:
            congestion = wp.get('congestion', 0.5)
            base_risk += congestion * 20

        if mode == TransportMode.SEA:
            base_risk += random.uniform(5, 15)
        elif mode == TransportMode.AIR:
            base_risk += random.uniform(3, 10)

        return min(base_risk, 100)

    def _calculate_eta(self, route: Route, departure: datetime) -> datetime:
        return departure + timedelta(hours=route.estimated_duration_hours)

    def _calculate_total_cost(self, route: Route) -> float:
        return (route.cost_usd or 0) + (route.fuel_cost_usd or 0)

    def _calculate_savings(self, route: Route, current_route: Optional[Route]) -> Dict[str, float]:
        if not current_route:
            return {'time_hours': 0, 'cost_usd': 0, 'risk_points': 0}

        time_savings = current_route.estimated_duration_hours - route.estimated_duration_hours
        cost_savings = self._calculate_total_cost(current_route) - self._calculate_total_cost(route)
        risk_savings = current_route.risk_score - route.risk_score

        return {
            'time_hours': round(time_savings, 2),
            'cost_usd': round(cost_savings, 2),
            'risk_points': round(risk_savings, 2)
        }

    def _score_route(self, comparison: RouteComparison, optimize_for: str) -> float:
        if optimize_for == 'time':
            return 100 - comparison.route.estimated_duration_hours / 24
        elif optimize_for == 'cost':
            return 100 - comparison.total_cost / 1000
        elif optimize_for == 'risk':
            return 100 - comparison.risk_score
        else:
            return (100 - comparison.route.estimated_duration_hours / 48) * 0.4 + \
                   (100 - comparison.total_cost / 5000) * 0.3 + \
                   (100 - comparison.risk_score) * 0.3

    def _generate_reasoning(self, best: Optional[RouteComparison], optimize_for: str) -> str:
        if not best:
            return "Current route is optimal. No better alternatives found."

        savings = best.savings_vs_current
        reasons = []

        if savings.get('time_hours', 0) > 0:
            reasons.append(f"{savings['time_hours']:.1f} hours faster")
        if savings.get('cost_usd', 0) > 0:
            reasons.append(f"${savings['cost_usd']:.0f} cheaper")
        if savings.get('risk_points', 0) > 0:
            reasons.append(f"{savings['risk_points']:.0f} points lower risk")

        if not reasons:
            return f"Recommended route offers similar performance with {best.route.transport_mode.value} mode."

        return f"Recommended route is {', '.join(reasons)}."

    def _route_to_response(self, route: Route):
        from schemas import RouteResponse
        return RouteResponse(
            id=route.id,
            shipment_id=route.shipment_id,
            origin_port=route.origin_port,
            destination_port=route.destination_port,
            waypoints=[RouteWaypoint(**wp) if isinstance(wp, dict) else wp for wp in route.waypoints],
            distance_km=route.distance_km,
            estimated_duration_hours=route.estimated_duration_hours,
            transport_mode=route.transport_mode,
            carrier=route.carrier,
            cost_usd=route.cost_usd,
            fuel_cost_usd=route.fuel_cost_usd,
            risk_score=route.risk_score,
            is_alternative=route.is_alternative,
            is_selected=route.is_selected,
            created_at=route.created_at,
            departure_time=route.departure_time,
            arrival_time=route.arrival_time
        )

    async def reroute_shipment(self, shipment_id: str, request: RerouteRequest) -> Dict[str, Any]:
        shipment = self.db.query(Shipment).filter(Shipment.id == shipment_id).first()
        if not shipment:
            raise ValueError(f"Shipment {shipment_id} not found")

        new_route = self.db.query(Route).filter(Route.id == request.new_route_id).first()
        if not new_route:
            raise ValueError(f"Route {request.new_route_id} not found")

        old_route = shipment.active_route

        shipment.active_route_id = new_route.id
        new_route.is_selected = True
        new_route.is_alternative = False

        if old_route:
            old_route.is_selected = False

        self.db.commit()

        time_saved = 0
        if old_route:
            time_saved = old_route.estimated_duration_hours - new_route.estimated_duration_hours

        return {
            'success': True,
            'shipment_id': shipment_id,
            'new_route_id': new_route.id,
            'time_saved_hours': round(time_saved, 2),
            'new_eta': self._calculate_eta(new_route, datetime.utcnow()),
            'reason': request.reason,
            'stakeholders_notified': request.notify_stakeholders
        }
