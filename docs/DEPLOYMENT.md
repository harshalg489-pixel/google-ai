# Deployment Guide

## Overview

This guide covers deploying the Supply Chain Disruption Detection System in production environments.

## Prerequisites

- Docker Engine 24.0+
- Docker Compose 2.20+
- Domain name with DNS configured
- SSL certificates (Let's Encrypt or custom)
- At least 4GB RAM and 2 vCPUs

## Production Configuration

### 1. Environment Setup

Create a `.env.production` file:

```bash
# Database
DB_USER=supplychain_prod
DB_PASSWORD=your_secure_password_here
DB_NAME=supplychain_prod_db
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}

# Security
ENVIRONMENT=production
SECRET_KEY=your-super-secret-key-here
CORS_ORIGINS=https://yourdomain.com

# External Services
WEATHER_API_KEY=your_openweathermap_key
REDIS_URL=redis://redis:6379

# Frontend
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
VITE_MAPBOX_TOKEN=your_mapbox_token
```

### 2. Docker Compose Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 30s
      timeout: 10s
      retries: 5

  backend:
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - ENVIRONMENT=production
      - SECRET_KEY=${SECRET_KEY}
      - CORS_ORIGINS=${CORS_ORIGINS}
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  frontend:
    environment:
      - VITE_API_URL=${VITE_API_URL}
      - VITE_WS_URL=${VITE_WS_URL}
    restart: unless-stopped
    deploy:
      replicas: 2

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - certbot_data:/etc/letsencrypt
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

  redis:
    restart: unless-stopped
    volumes:
      - redis_prod_data:/data

volumes:
  postgres_prod_data:
  redis_prod_data:
  certbot_data:
```

### 3. Nginx Configuration

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:5173;
    }

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /ws {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 86400;
        }
    }
}
```

## Deployment Steps

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create directories
mkdir -p ~/supply-chain-app
mkdir -p ~/supply-chain-app/nginx/ssl
```

### 2. SSL Certificates (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ~/supply-chain-app/nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ~/supply-chain-app/nginx/ssl/
```

### 3. Deploy Application

```bash
cd ~/supply-chain-app

# Clone repository
git clone <your-repo-url> .

# Create production environment file
cp .env.example .env.production
# Edit .env.production with production values

# Start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose exec backend alembic upgrade head

# Check status
docker-compose ps
```

### 4. Backup Configuration

Create a backup script `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/supply-chain"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec supply_chain_db pg_dump -U supplychain_prod supplychain_prod_db > \
  $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Backup Redis (if persistence needed)
docker exec supply_chain_redis redis-cli BGSAVE

# Compress and upload to S3 (optional)
tar -czf $BACKUP_DIR/backup_$TIMESTAMP.tar.gz $BACKUP_DIR/db_backup_$TIMESTAMP.sql
aws s3 cp $BACKUP_DIR/backup_$TIMESTAMP.tar.gz s3://your-backup-bucket/

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /path/to/backup.sh
```

### 5. Monitoring Setup

Install monitoring stack:

```bash
# Prometheus
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Grafana
docker run -d \
  --name grafana \
  -p 3000:3000 \
  -v grafana_data:/var/lib/grafana \
  grafana/grafana
```

## Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Clean up old images
docker image prune -f
```

### Database Maintenance

```bash
# Vacuum and analyze
docker-compose exec db psql -U supplychain_prod -d supplychain_prod_db -c "VACUUM ANALYZE;"
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend

# View last 100 lines
docker-compose logs --tail=100 backend
```

## Troubleshooting

### Database Connection Issues

```bash
# Check database health
docker-compose exec db pg_isready -U supplychain_prod

# Check connection from backend
docker-compose exec backend python -c "
from database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text('SELECT 1'))
    print(result.scalar())
"
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Database slow queries
docker-compose exec db psql -U supplychain_prod -c "
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
"
```

## Security Checklist

- [ ] SSL/TLS enabled
- [ ] Environment variables secured
- [ ] Database passwords strong
- [ ] CORS origins restricted
- [ ] Rate limiting implemented
- [ ] Input validation in place
- [ ] Security headers configured
- [ ] Backup encryption enabled
- [ ] Access logs monitored
- [ ] Regular security updates

## Rollback Procedure

```bash
# Stop services
docker-compose down

# Restore database from backup
docker-compose up -d db
docker-compose exec -T db psql -U supplychain_prod supplychain_prod_db < backup.sql

# Restart services
docker-compose up -d
```
