# First Client Deployment - buymejewellery.co.uk
## Complete Implementation Guide

### Domain Setup Instructions

#### 1. DNS Configuration (Client's Domain Panel)
```
Type    Name                           Value
A       api-shop.buymejewellery.co.uk  YOUR_VPS_IP
A       pos.buymejewellery.co.uk       YOUR_VPS_IP  
A       api-pos.buymejewellery.co.uk   YOUR_VPS_IP
```

#### 2. SSL Certificate Setup
```bash
# Single wildcard certificate for all subdomains
sudo certbot certonly --nginx \
  -d buymejewellery.co.uk \
  -d *.buymejewellery.co.uk

# Verify certificates
sudo certbot certificates
```

#### 3. Directory Structure
```
/var/www/
├── buymejewellery.co.uk/          # E-commerce frontend
├── api-shop.buymejewellery.co.uk/ # E-commerce API
├── pos.buymejewellery.co.uk/      # POS frontend (React build)
└── api-pos.buymejewellery.co.uk/  # POS API (NestJS)
```

### Docker Deployment Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # PostgreSQL for POS System
  pos_database:
    image: postgres:16
    container_name: pos_postgres
    environment:
      POSTGRES_DB: jewelry_pos
      POSTGRES_USER: pos_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: always
    deploy:
      resources:
        limits:
          memory: 3G
        reservations:
          memory: 2G

  # Redis Cache
  redis_cache:
    image: redis:7-alpine
    container_name: pos_redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: always
    deploy:
      resources:
        limits:
          memory: 1G

  # POS Backend (NestJS)
  pos_backend:
    build: 
      context: ./pos-backend
      dockerfile: Dockerfile.prod
    container_name: pos_api
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://pos_user:${DB_PASSWORD}@pos_postgres:5432/jewelry_pos
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis_cache:6379
      JWT_SECRET: ${JWT_SECRET}
      GOOGLE_DRIVE_CREDENTIALS: ${GOOGLE_DRIVE_CREDS}
      CLIENT_ID: buymejewellery
      CLIENT_DOMAIN: buymejewellery.co.uk
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    ports:
      - "3003:3000"
    depends_on:
      - pos_database
      - redis_cache
    restart: always
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 3G

  # E-commerce Backend (Node.js/Express)
  ecommerce_backend:
    build:
      context: ./ecommerce-backend
      dockerfile: Dockerfile
    container_name: ecommerce_api
    environment:
      NODE_ENV: production
      DB_HOST: mysql_ecommerce
      DB_USER: ecommerce_user
      DB_PASSWORD: ${ECOMMERCE_DB_PASSWORD}
      DB_NAME: ecommerce_db
    volumes:
      - ./ecommerce-uploads:/app/uploads
    ports:
      - "3001:3000"
    depends_on:
      - mysql_ecommerce
    restart: always
    deploy:
      resources:
        limits:
          memory: 2G

  # MySQL for E-commerce (existing)
  mysql_ecommerce:
    image: mysql:8.0
    container_name: ecommerce_mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ecommerce_db
      MYSQL_USER: ecommerce_user
      MYSQL_PASSWORD: ${ECOMMERCE_DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: always
    deploy:
      resources:
        limits:
          memory: 2G

  # Nginx Reverse Proxy
  nginx_proxy:
    image: nginx:alpine
    container_name: nginx_proxy
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/sites:/etc/nginx/sites-available
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www:/var/www:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - pos_backend
      - ecommerce_backend
    restart: always
    deploy:
      resources:
        limits:
          memory: 512M

volumes:
  postgres_data:
  redis_data:
  mysql_data:
```

### Environment Variables (.env)
```bash
# Database Passwords
DB_PASSWORD=secure_postgres_password_here
ECOMMERCE_DB_PASSWORD=secure_mysql_password_here
MYSQL_ROOT_PASSWORD=secure_root_password_here
REDIS_PASSWORD=secure_redis_password_here

# JWT & Security
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_REFRESH_SECRET=your-refresh-token-secret-here

# Google Drive API
GOOGLE_DRIVE_CREDS=path/to/service-account-key.json

# Client Configuration
CLIENT_ID=buymejewellery
CLIENT_NAME=Buy Me Jewellery
CLIENT_DOMAIN=buymejewellery.co.uk

# API URLs
POS_API_URL=https://api-pos.buymejewellery.co.uk
ECOMMERCE_API_URL=https://api-shop.buymejewellery.co.uk
```

### Complete Deployment Commands

```bash
# 1. Clone and setup
git clone your-pos-repo
cd pos-system

# 2. Environment setup
cp .env.example .env
# Edit .env with actual values

# 3. Build and deploy
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Database migrations
docker exec pos_api npm run migrate

# 5. Create admin user
docker exec pos_api npm run create-admin

# 6. Test all endpoints
curl -k https://api-pos.buymejewellery.co.uk/health
curl -k https://api-shop.buymejewellery.co.uk/health
```

### Monitoring Setup
```bash
# Install monitoring tools
npm install -g pm2

# PM2 monitoring for Docker containers
pm2 start ecosystem.config.js

# Health checks
#!/bin/bash
# healthcheck.sh
curl -f https://pos.buymejewellery.co.uk/health || exit 1
curl -f https://api-pos.buymejewellery.co.uk/health || exit 1
curl -f https://api-shop.buymejewellery.co.uk/health || exit 1
```

This deployment gives you:
✅ Complete separation of e-commerce and POS systems
✅ All features ready for jewelry business
✅ Easy migration path to company VPS later
✅ Production-ready with monitoring and backups