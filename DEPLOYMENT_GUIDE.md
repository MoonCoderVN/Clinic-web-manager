# 🚀 Hướng Dẫn Deploy & Testing DentaCare MERN

## 📋 Checklist Trước Deploy

### 1. Environment Setup
```bash
# Server
cd server
cp .env.example .env
# Cập nhật các giá trị:
# - MONGODB_URI
# - JWT_SECRET (min 32 chars)
# - JWT_REFRESH_SECRET (min 32 chars)
# - GEMINI_API_KEY
# - MAIL_USER, MAIL_PASS
# - GOOGLE_CLIENT_ID
# - CLIENT_URL

# Client
cd ../client
cp .env.example .env
# Cập nhật:
# - VITE_API_URL
# - VITE_GOOGLE_CLIENT_ID
```

### 2. Dependencies
```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 3. Database
```bash
# Tạo MongoDB Atlas cluster
# Cập nhật MONGODB_URI trong .env
# Admin account sẽ được tự động seed
```

---

## 🧪 Testing

### Unit Tests
```bash
# Server
cd server
npm test

# Client
cd ../client
npm test
```

### Integration Tests
```bash
# Test auth flow
curl -X POST http://localhost:5002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "Test@123456",
    "phone": "0901234567"
  }'

# Test appointment creation
curl -X POST http://localhost:5002/api/appointments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "DOCTOR_ID",
    "serviceId": "SERVICE_ID",
    "appointmentDate": "2026-05-25",
    "startTime": "09:00",
    "endTime": "09:30"
  }'
```

### Manual Testing Checklist
- [ ] Đăng ký tài khoản mới
- [ ] Đăng nhập với email/password
- [ ] Đăng nhập với Google OAuth
- [ ] Refresh token khi hết hạn
- [ ] Đặt lịch khám
- [ ] Hủy lịch khám
- [ ] Xem lịch khám
- [ ] Chat với AI chatbot
- [ ] Upload avatar
- [ ] Cập nhật profile
- [ ] Admin dashboard
- [ ] Doctor dashboard
- [ ] Patient dashboard

---

## 🏃 Local Development

### Start Server
```bash
cd server
npm run dev
# Server chạy trên http://localhost:5002
```

### Start Client
```bash
cd client
npm run dev
# Client chạy trên http://localhost:5173
```

### View Logs
```bash
# Server logs
tail -f logs/combined.log
tail -f logs/error.log

# Client console
# Mở DevTools (F12) → Console tab
```

---

## 🌐 Production Deployment

### Server (Node.js)

#### Option 1: Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create dentacare-api

# Set environment variables
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set JWT_REFRESH_SECRET=your_refresh_secret
# ... set other env vars

# Deploy
git push heroku main
```

#### Option 2: DigitalOcean / AWS / VPS
```bash
# SSH vào server
ssh root@your_server_ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone your_repo_url
cd clinic-web-main/server

# Install dependencies
npm install --production

# Create .env file
nano .env
# Paste production environment variables

# Install PM2 (process manager)
npm install -g pm2

# Start server
pm2 start src/index.js --name "dentacare-api"
pm2 save
pm2 startup

# Setup Nginx reverse proxy
sudo apt-get install nginx
sudo nano /etc/nginx/sites-available/default
# Configure proxy to localhost:5002
sudo systemctl restart nginx
```

### Client (React)

#### Build
```bash
cd client
npm run build
# Output: dist/
```

#### Option 1: Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

#### Option 2: Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

#### Option 3: Self-hosted
```bash
# Copy dist folder to server
scp -r dist/ root@your_server_ip:/var/www/dentacare

# Configure Nginx
sudo nano /etc/nginx/sites-available/default
# Add location block for React app
sudo systemctl restart nginx
```

---

## 📊 Monitoring

### Server Monitoring
```bash
# CPU, Memory usage
pm2 monit

# View logs
pm2 logs dentacare-api

# Restart if crash
pm2 restart dentacare-api
```

### Database Monitoring
```bash
# MongoDB Atlas Dashboard
# https://cloud.mongodb.com/

# Check connection
mongo "mongodb+srv://user:pass@cluster.mongodb.net/dentacare"
```

### Application Logs
```bash
# Winston logs
tail -f logs/combined.log | grep ERROR
tail -f logs/error.log

# Real-time monitoring
watch -n 1 'tail -20 logs/combined.log'
```

### Performance Metrics
```bash
# Response time
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5002/api/health

# Database query performance
# MongoDB Atlas → Performance Advisor
```

---

## 🔒 Security Checklist

- [ ] JWT_SECRET min 32 characters
- [ ] JWT_REFRESH_SECRET min 32 characters
- [ ] HTTPS enabled (SSL certificate)
- [ ] CORS whitelist configured
- [ ] Rate limiting enabled
- [ ] Input validation enabled
- [ ] Error messages don't leak sensitive info
- [ ] Logs don't contain passwords/tokens
- [ ] Database backups enabled
- [ ] Environment variables not in git
- [ ] Admin account password changed
- [ ] Email credentials secured

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Check logs
pm2 logs dentacare-api

# Check port 5002 is available
lsof -i :5002

# Check environment variables
echo $MONGODB_URI
echo $JWT_SECRET
```

### Database connection error
```bash
# Test connection
mongo "mongodb+srv://user:pass@cluster.mongodb.net/dentacare"

# Check IP whitelist in MongoDB Atlas
# https://cloud.mongodb.com/ → Network Access
```

### Rate limiting too strict
```bash
# Adjust in server/src/middlewares/rateLimit.js
# Increase max or windowMs values
```

### Logs too large
```bash
# Rotate logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 10
```

---

## 📈 Performance Optimization

### Database
```javascript
// Ensure indexes are created
db.appointments.createIndex({ patientId: 1, appointmentDate: -1 })
db.appointments.createIndex({ doctorId: 1, appointmentDate: -1 })
db.appointments.createIndex({ status: 1, appointmentDate: 1 })
```

### Caching
```bash
# Install Redis
sudo apt-get install redis-server

# Use in Node.js
npm install redis
```

### CDN
```bash
# Serve static assets from CDN
# Configure in Nginx or use CloudFlare
```

---

## 📞 Support

- **Issues:** GitHub Issues
- **Email:** support@dentacare.com
- **Documentation:** /docs

---

**Last Updated:** 2026-05-17
