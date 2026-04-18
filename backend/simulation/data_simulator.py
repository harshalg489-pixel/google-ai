#!/usr/bin/env python3
"""
Data simulator for generating realistic supply chain data
"""

import asyncio
import random
import httpx
from datetime import datetime, timedelta
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

API_URL = os.getenv("API_URL", "http://localhost:8000")

CARRIERS = {
    'sea': ['Maersk', 'MSC', 'CMA CGM', 'Evergreen', 'Hapag-Lloyd', 'ONE', 'Cosco'],
    'air': ['DHL', 'FedEx', 'UPS', 'Emirates SkyCargo', 'Lufthansa Cargo'],
    'rail': ['DB Schenker', 'Rail Cargo Austria', 'SNCF'],
    'truck': ['DHL Freight', 'Kuehne+Nagel', 'DB Schenker']
}

MAJOR_PORTS = [
    {'code': 'SIN', 'name': 'Singapore', 'lat': 1.29, 'lon': 103.85},
    {'code': 'SHA', 'name': 'Shanghai', 'lat': 31.23, 'lon': 121.47},
    {'code': 'NGB', 'name': 'Ningbo', 'lat': 29.86, 'lon': 121.57},
    {'code': 'SZX', 'name': 'Shenzhen', 'lat': 22.54, 'lon': 114.06},
    {'code': 'HKG', 'name': 'Hong Kong', 'lat': 22.32, 'lon': 114.17},
    {'code': 'LAX', 'name': 'Los Angeles', 'lat': 33.73, 'lon': -118.26},
    {'code': 'LGB', 'name': 'Long Beach', 'lat': 33.75, 'lon': -118.19},
    {'code': 'NYC', 'name': 'New York', 'lat': 40.68, 'lon': -74.04},
    {'code': 'RTM', 'name': 'Rotterdam', 'lat': 51.92, 'lon': 4.48},
    {'code': 'HAM', 'name': 'Hamburg', 'lat': 53.55, 'lon': 9.99},
    {'code': 'ANR', 'name': 'Antwerp', 'lat': 51.22, 'lon': 4.40},
    {'code': 'DXB', 'name': 'Jebel Ali', 'lat': 24.99, 'lon': 55.06},
    {'code': 'TYO', 'name': 'Tokyo', 'lat': 35.65, 'lon': 139.79},
    {'code': 'PUS', 'name': 'Busan', 'lat': 35.10, 'lon': 129.04},
]

CARGO_TYPES = ['Electronics', 'Automotive', 'Textiles', 'Machinery', 'Chemicals',
               'Pharma', 'Food', 'Consumer Goods', 'Industrial', 'Raw Materials']


class DataSimulator:
    def __init__(self):
        self.client = httpx.AsyncClient(base_url=API_URL, timeout=30.0)
        self.generated_shipments = []

    def _generate_tracking_number(self) -> str:
        prefix = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=3))
        suffix = ''.join(random.choices('0123456789', k=10))
        return f"{prefix}{suffix}"

    def _select_ports(self) -> tuple:
        origin = random.choice(MAJOR_PORTS)
        dest = random.choice([p for p in MAJOR_PORTS if p['code'] != origin['code']])
        return origin, dest

    async def create_shipment(self) -> dict:
        origin, dest = self._select_ports()
        transport_mode = random.choice(['sea', 'air'])
        carrier = random.choice(CARRIERS[transport_mode])

        shipment_data = {
            "tracking_number": self._generate_tracking_number(),
            "carrier": carrier,
            "transport_mode": transport_mode,
            "origin": {
                "latitude": origin['lat'] + random.uniform(-0.1, 0.1),
                "longitude": origin['lon'] + random.uniform(-0.1, 0.1),
                "name": origin['name'],
                "country_code": origin['code'][:2],
                "port_code": origin['code']
            },
            "destination": {
                "latitude": dest['lat'] + random.uniform(-0.1, 0.1),
                "longitude": dest['lon'] + random.uniform(-0.1, 0.1),
                "name": dest['name'],
                "country_code": dest['code'][:2],
                "port_code": dest['code']
            },
            "planned_eta": (datetime.utcnow() + timedelta(days=random.randint(5, 30))).isoformat(),
            "cargo_type": random.choice(CARGO_TYPES),
            "weight_kg": round(random.uniform(1000, 50000), 2),
            "value_usd": round(random.uniform(50000, 5000000), 2)
        }

        try:
            response = await self.client.post("/api/v1/shipments", json=shipment_data)
            if response.status_code == 200:
                shipment = response.json()
                self.generated_shipments.append(shipment['id'])
                print(f"Created shipment: {shipment['tracking_number']}")
                return shipment
            else:
                print(f"Failed to create shipment: {response.text}")
        except Exception as e:
            print(f"Error creating shipment: {e}")
        return None

    async def update_shipment_location(self) -> None:
        if not self.generated_shipments:
            return

        shipment_id = random.choice(self.generated_shipments)

        update_data = {
            "current_status": random.choice(['in_transit', 'at_risk', 'delayed']),
            "risk_score": random.uniform(0, 100)
        }

        try:
            await self.client.put(f"/api/v1/shipments/{shipment_id}", json=update_data)
            print(f"Updated shipment {shipment_id}")
        except Exception as e:
            print(f"Error updating shipment: {e}")

    async def run(self):
        print("Starting data simulator...")
        print(f"API URL: {API_URL}")

        while True:
            try:
                await self.create_shipment()

                if random.random() < 0.3 and self.generated_shipments:
                    await self.update_shipment_location()

                await asyncio.sleep(random.uniform(5, 15))

            except Exception as e:
                print(f"Simulator error: {e}")
                await asyncio.sleep(5)


async def main():
    simulator = DataSimulator()
    await simulator.run()


if __name__ == "__main__":
    asyncio.run(main())
