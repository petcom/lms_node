# LMS API - Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Production Deployment](#production-deployment)
- [Database Setup](#database-setup)
- [Process Management](#process-management)
- [Monitoring](#monitoring)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **Node.js**: v22.13.1 or higher (LTS recommended)
- **MongoDB**: v5.0 or higher
- **RAM**: Minimum 2GB, recommended 4GB
- **Storage**: Minimum 10GB free space
- **OS**: Ubuntu 20.04+, CentOS 8+, or macOS

### Required Tools
- `npm` v10.x or higher
- `git`
- Process manager (`pm2` recommended)
- Reverse proxy (Nginx or Apache)

---

## Environment Setup

### 1. Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Database Configuration (REQUIRED)
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/lms_production?retryWrites=true&w=majority

# JWT Configuration (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-minimum-64-characters-for-production
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Server Configuration (REQUIRED)
PORT=8082
NODE_ENV=production

# Logging Configuration
LOG_LEVEL=info

# CORS Configuration (REQUIRED)
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Rate Limiting (Optional - defaults provided)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email Configuration (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Optional Performance Settings
MONGODB_POOL_SIZE=10
COMPRESSION_LEVEL=6
```

### 2. Environment-Specific Configurations

#### Production (.env.production)
```bash
NODE_ENV=production
LOG_LEVEL=error
MONGO_URL=<production-mongodb-url>
ALLOWED_ORIGINS=https://yourdomain.com
```

#### Staging (.env.staging)
```bash
NODE_ENV=staging
LOG_LEVEL=info
MONGO_URL=<staging-mongodb-url>
ALLOWED_ORIGINS=https://staging.yourdomain.com
```

#### Development (.env)
```bash
NODE_ENV=development
LOG_LEVEL=debug
MONGO_URL=mongodb://localhost:27017/lms_db
ALLOWED_ORIGINS=http://localhost:3000
```

---

## Production Deployment

### Option 1: Traditional Server Deployment

#### Step 1: Clone Repository
```bash
git clone https://github.com/yourusername/lms_node.git
cd lms_node
```

#### Step 2: Install Dependencies
```bash
npm ci --production
```

#### Step 3: Configure Environment
```bash
cp .env.example .env
nano .env  # Edit with production values
```

#### Step 4: Start with PM2
```bash
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Option 2: Docker Deployment

```bash
# Build image
docker build -t lms-api:latest .

# Run container
docker run -d \
  --name lms-api \
  -p 8082:8082 \
  --env-file .env.production \
  --restart unless-stopped \
  lms-api:latest
```

### Option 3: Cloud Platform Deployment

#### Heroku
```bash
heroku create lms-api-production
heroku config:set NODE_ENV=production
heroku config:set MONGO_URL=<your-mongodb-url>
heroku config:set JWT_SECRET=<your-secret>
git push heroku main
```

#### AWS Elastic Beanstalk
```bash
eb init -p node.js-22 lms-api
eb create lms-api-production
eb deploy
```

#### DigitalOcean App Platform
- Connect GitHub repository
- Configure environment variables
- Deploy from dashboard

---

## Database Setup

### MongoDB Atlas (Recommended for Production)

1. **Create Cluster**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a new cluster (M10+ recommended for production)
   - Select your preferred region

2. **Configure Database User**
   ```
   Username: lms_admin
   Password: <generate-strong-password>
   Privileges: Read and Write to any database
   ```

3. **Whitelist IP Addresses**
   - Add your server's IP address
   - For development: 0.0.0.0/0 (NOT recommended for production)

4. **Get Connection String**
   ```
   mongodb+srv://<username>:<password>@cluster.mongodb.net/lms_production?retryWrites=true&w=majority
   ```

### Self-Hosted MongoDB

```bash
# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database and user
mongo
> use lms_production
> db.createUser({
    user: "lms_admin",
    pwd: "your-secure-password",
    roles: ["readWrite"]
  })
```

### Database Indexes

Indexes are automatically created when the application starts. To manually create them:

```javascript
// Connect to MongoDB
mongo mongodb://localhost:27017/lms_production

// Create indexes
db.admins.createIndex({ email: 1 }, { unique: true })
db.teachers.createIndex({ email: 1 }, { unique: true })
db.students.createIndex({ email: 1 }, { unique: true })
db.academicYears.createIndex({ name: 1 }, { unique: true })
db.exams.createIndex({ createdBy: 1 })
db.examResults.createIndex({ student: 1, exam: 1 })
```

---

## Process Management

### PM2 Configuration (ecosystem.config.js)

```javascript
module.exports = {
  apps: [{
    name: 'lms-api',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 8082
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};
```

### PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js --env production

# View logs
pm2 logs lms-api

# Monitor
pm2 monit

# Restart
pm2 restart lms-api

# Stop
pm2 stop lms-api

# Delete
pm2 delete lms-api

# Save configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

---

## Reverse Proxy Setup

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8082;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8082/health;
        access_log off;
    }
}
```

### SSL Configuration with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Monitoring

### Health Checks

The application provides health check endpoints:

- **Liveness**: `GET /health` - Returns 200 if app is running
- **Readiness**: `GET /ready` - Returns 200 if app is ready to serve traffic

### Application Monitoring

**PM2 Monitoring**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

**Log Files**
- Application logs: `./logs/application.log`
- Error logs: `./logs/error.log`
- Access logs: `./logs/access.log`

### Recommended Monitoring Services
- **New Relic** - APM monitoring
- **Datadog** - Infrastructure & APM
- **Sentry** - Error tracking
- **Papertrail** - Log management

---

## Backup & Recovery

### Automated MongoDB Backups

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
MONGO_URL="mongodb://localhost:27017"
DB_NAME="lms_production"

# Create backup
mongodump --uri="$MONGO_URL" --db="$DB_NAME" --out="$BACKUP_DIR/$DATE"

# Compress backup
tar -czf "$BACKUP_DIR/$DATE.tar.gz" "$BACKUP_DIR/$DATE"
rm -rf "$BACKUP_DIR/$DATE"

# Remove backups older than 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE.tar.gz"
```

### Cron Job for Daily Backups

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/mongodb-backup.log 2>&1
```

### Restore from Backup

```bash
# Extract backup
tar -xzf /var/backups/mongodb/20241218_020000.tar.gz

# Restore database
mongorestore --uri="mongodb://localhost:27017" --db="lms_production" /var/backups/mongodb/20241218_020000/lms_production
```

---

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check Node.js version
node --version  # Should be v22.13.1+

# Check environment variables
cat .env | grep -E "MONGO_URL|JWT_SECRET|PORT"

# Check logs
pm2 logs lms-api --lines 100

# Check port availability
sudo lsof -i :8082
```

#### Database Connection Issues
```bash
# Test MongoDB connection
mongo "mongodb+srv://cluster.mongodb.net/test" --username <username>

# Check network connectivity
ping cluster.mongodb.net

# Verify IP whitelist in MongoDB Atlas
```

#### High Memory Usage
```bash
# Check memory usage
pm2 monit

# Restart with lower instances
pm2 delete lms-api
pm2 start ecosystem.config.js --env production -i 2

# Increase max memory restart
pm2 start server.js --max-memory-restart 1G
```

#### Rate Limiting Issues
- Adjust rate limit settings in `.env`
- Check Redis connection if using distributed rate limiting
- Review rate limiter middleware configuration

---

## Security Checklist

- [ ] All environment variables set correctly
- [ ] JWT_SECRET is strong (64+ characters)
- [ ] MongoDB credentials secure
- [ ] HTTPS enabled (SSL certificate)
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled
- [ ] Helmet middleware active
- [ ] MongoDB sanitization enabled
- [ ] No sensitive data in logs
- [ ] npm audit shows no vulnerabilities
- [ ] Firewall configured (only necessary ports open)

---

## Performance Optimization

### Recommended Settings

```bash
# Node.js
NODE_OPTIONS="--max-old-space-size=2048"

# MongoDB
MONGODB_POOL_SIZE=10

# Compression
COMPRESSION_LEVEL=6
```

### Load Balancing

For high traffic, consider:
- Horizontal scaling with PM2 cluster mode
- Load balancer (Nginx, HAProxy)
- CDN for static assets
- Redis for session storage and caching

---

## Support & Maintenance

### Regular Maintenance Tasks

- **Daily**: Monitor error logs
- **Weekly**: Review performance metrics
- **Monthly**: Update dependencies (`npm update`)
- **Quarterly**: Security audit (`npm audit`)

### Emergency Contacts

- DevOps Team: devops@yourdomain.com
- On-Call: +1-xxx-xxx-xxxx
- Incident Management: incidents@yourdomain.com

---

**Last Updated**: December 18, 2025  
**Version**: 1.0.0  
**Maintained by**: LMS Development Team
