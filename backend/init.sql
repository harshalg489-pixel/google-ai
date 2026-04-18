-- Initialize database with extensions and sample data

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(current_status);
CREATE INDEX IF NOT EXISTS idx_shipments_eta ON shipments(planned_eta);
CREATE INDEX IF NOT EXISTS idx_risk_events_shipment ON risk_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_alerts_shipment ON alerts(shipment_id);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(is_acknowledged);
