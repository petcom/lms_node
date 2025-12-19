# LMS API - Learning Management System

> A comprehensive, production-ready RESTful API for school management with authentication, authorization, exam management, and academic administration.

[![Node.js](https://img.shields.io/badge/Node.js-v22.13.1-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Security](https://img.shields.io/badge/Security-Audited-brightgreen.svg)](SECURITY.md)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Features

### Authentication & Authorization
- ✅ JWT-based authentication with refresh tokens
- ✅ Role-based access control (Admin, Teacher, Student)
- ✅ Secure password hashing with bcrypt
- ✅ Password reset functionality
- ✅ Token blacklisting for logout
- ✅ Session management across devices

### Admin Dashboard
- ✅ Staff management (Teachers)
- ✅ Student enrollment and management
- ✅ Academic year/term configuration
- ✅ Program and subject management
- ✅ Exam result publishing controls
- ✅ Staff suspension/withdrawal

### Teacher Capabilities
- ✅ Create and manage exams
- ✅ Add questions to exams
- ✅ View student results
- ✅ Profile management

### Student Features
- ✅ Take online exams
- ✅ View exam results
- ✅ Multiple exam attempts (configurable)
- ✅ Profile management
- ✅ Academic performance tracking

### Academic Management
- ✅ Academic year/term management
- ✅ Year group configuration
- ✅ Class level management
- ✅ Subject assignment
- ✅ Program management
- ✅ Student promotion system

### Security Features
- ✅ Rate limiting (prevent brute force)
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ MongoDB sanitization
- ✅ Input validation with Joi
- ✅ Password strength requirements
- ✅ No SQL injection vulnerabilities

### Performance Optimizations
- ✅ Gzip compression
- ✅ Response caching
- ✅ Database query optimization (.lean())
- ✅ MongoDB indexes
- ✅ Pagination support

### Developer Experience
- ✅ Comprehensive API documentation (Swagger)
- ✅ Structured error handling
- ✅ Detailed logging (Winston)
- ✅ Testing suite (Jest)
- ✅ Hot reload (Nodemon)

---

## 🛠️ Tech Stack

**Runtime & Framework:**
- Node.js v22.13.1 (LTS)
- Express.js v4.21.2

**Database:**
- MongoDB v5.0+ (with Mongoose ODM)

**Authentication:**
- JSON Web Tokens (JWT)
- bcryptjs for password hashing

**Security:**
- Helmet (HTTP headers)
- CORS
- express-rate-limit
- express-mongo-sanitize
- dotenv-safe

**Documentation:**
- Swagger/OpenAPI 3.0
- swagger-jsdoc
- swagger-ui-express

**Testing:**
- Jest
- Supertest
- MongoDB Memory Server

**Logging:**
- Winston
- Morgan

**Validation:**
- Joi

**Performance:**
- compression (gzip)
- Custom caching middleware

---

## 🚀 Quick Start

### Prerequisites

- Node.js v22.13.1 or higher
- MongoDB v5.0 or higher
- npm v10.x or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/lms_node.git
   cd lms_node
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

The API will be available at `http://localhost:8082`

---

## 📚 API Documentation

### Interactive Documentation

Once the server is running, access the interactive Swagger UI documentation:

**URL**: `http://localhost:8082/api-docs`

### Quick API Reference

#### Authentication
```http
POST   /api/v1/admins/register     # Register new admin
POST   /api/v1/admins/login        # Admin login
POST   /api/v1/teachers/login      # Teacher login  
POST   /api/v1/students/login      # Student login
POST   /api/v1/auth/refresh        # Refresh access token
POST   /api/v1/auth/logout         # Logout current session
```

#### Admin Endpoints
```http
GET    /api/v1/admins              # Get all admins (paginated)
GET    /api/v1/admins/profile      # Get admin profile
PUT    /api/v1/admins              # Update admin profile
PUT    /api/v1/admins/suspend/teacher/:id    # Suspend teacher
PUT    /api/v1/admins/publish/exam/:id       # Publish exam results
```

#### Academic Management
```http
GET    /api/v1/academic-years      # List academic years
POST   /api/v1/academic-years      # Create academic year
GET    /api/v1/academic-years/:id  # Get specific year
PUT    /api/v1/academic-years/:id  # Update academic year
DELETE /api/v1/academic-years/:id  # Delete academic year
```

#### Exams
```http
GET    /api/v1/exams               # List all exams
POST   /api/v1/exams               # Create new exam
GET    /api/v1/exams/:id           # Get exam details
PUT    /api/v1/exams/:id           # Update exam
DELETE /api/v1/exams/:id           # Delete exam
```

### Health Checks
```http
GET    /health                     # Application health
GET    /ready                      # Readiness check
```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```bash
# Database Configuration (REQUIRED)
MONGO_URL=mongodb://localhost:27017/lms_db

# JWT Configuration (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-minimum-64-characters
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Server Configuration
PORT=8082
NODE_ENV=development

# Logging
LOG_LEVEL=info

# CORS (REQUIRED)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8082
```

See `.env.example` for all available options.

---

## 📁 Project Structure

```
lms_node/
├── app/
│   └── app.js                 # Express application setup
├── config/
│   ├── cors.js               # CORS configuration
│   ├── dbConnect.js          # MongoDB connection
│   └── swagger.js            # Swagger/OpenAPI config
├── controller/
│   ├── academics/            # Academic controllers
│   ├── auth/                 # Authentication controllers
│   ├── staff/                # Staff controllers
│   └── students/             # Student controllers
├── middlewares/
│   ├── advancedResults.js    # Pagination middleware
│   ├── caching.js            # Caching middleware
│   ├── globalErrHandler.js   # Error handling
│   ├── isAuthenticated.js    # Auth middleware
│   ├── rateLimiter.js        # Rate limiting
│   ├── roleRestriction.js    # RBAC middleware
│   └── validate.js           # Validation middleware
├── model/
│   ├── Academic/             # Academic models
│   ├── Auth/                 # Auth models
│   └── Staff/                # Staff models
├── routes/
│   ├── academics/            # Academic routes
│   ├── auth/                 # Auth routes
│   ├── staff/                # Staff routes
│   └── students/             # Student routes
├── tests/
│   ├── unit/                 # Unit tests
│   └── integration/          # Integration tests
├── utils/
│   ├── generateToken.js      # JWT utilities
│   ├── helpers.js            # Helper functions
│   ├── logger.js             # Winston logger
│   └── response.js           # Response formatters
├── validators/               # Joi validation schemas
├── logs/                     # Application logs
├── .env                      # Environment variables
├── .env.example              # Environment template
├── server.js                 # Entry point
├── ecosystem.config.js       # PM2 configuration
├── DEPLOYMENT.md             # Deployment guide
└── README.md                 # This file
```

---

## 💻 Development

### TypeScript Migration

This project is currently migrating from JavaScript to TypeScript for improved type safety and developer experience.

**Current Status**: Phase 1 Complete - Foundation & Tooling Setup

**TypeScript Features**:
- ✅ Full TypeScript configuration with strict mode
- ✅ ESLint with TypeScript support
- ✅ Prettier code formatting
- ✅ ts-jest for TypeScript testing
- ✅ Type definitions for all dependencies

### Available Scripts

```bash
# TypeScript Development
npm run dev:ts              # Run with ts-node-dev (hot reload)
npm run build               # Compile TypeScript to JavaScript
npm run build:watch         # Watch mode compilation
npm run type-check          # Type check without compilation
npm run type-check:watch    # Watch mode type checking

# JavaScript Development (during migration)
npm run dev                 # Development with nodemon
npm start                   # Production mode

# Testing
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only

# Code Quality
npm run lint                # Run ESLint
npm run lint:fix            # Fix linting issues
npm run format              # Format code with Prettier
npm run format:check        # Check formatting

# Security
npm audit                   # Security audit
npm audit fix               # Fix vulnerabilities
```

### Development Workflow

1. Create a new branch for your feature
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and test thoroughly
   ```bash
   npm run type-check      # Check TypeScript types
   npm run lint            # Check code quality
   npm test                # Run tests
   ```

3. Format your code
   ```bash
   npm run format
   ```

4. Commit with conventional commits
   ```bash
   git commit -m "feat: add new feature"
   ```

5. Push and create a pull request
   ```bash
   git push origin feature/your-feature-name
   ```

---

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration
```

### TypeScript Type Checking

```bash
# Type check without compilation
npm run type-check

# Type check in watch mode
npm run type-check:watch
```

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

### Test Structure

- **Unit Tests**: Test individual functions and utilities
- **Integration Tests**: Test API endpoints with real database

### Test Coverage

- Target: >70% code coverage
- Current coverage includes:
  - Helper functions
  - Response utilities
  - Admin authentication
  - Academic year CRUD

---

## 🚢 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start application in production
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

### Docker Deployment

```bash
# Build image
docker build -t lms-api:latest .

# Run container
docker run -d -p 8082:8082 --env-file .env lms-api:latest
```

---

## 🔒 Security

### Security Features

- ✅ **Authentication**: JWT with refresh tokens
- ✅ **Authorization**: Role-based access control
- ✅ **Rate Limiting**: Prevent brute force attacks
- ✅ **Input Validation**: Joi schema validation
- ✅ **SQL Injection**: MongoDB sanitization
- ✅ **XSS Protection**: Helmet security headers
- ✅ **CORS**: Configurable origin whitelisting
- ✅ **Password Security**: bcrypt hashing with salt
- ✅ **Audit**: No vulnerabilities (npm audit)

### Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **JWT Secrets**: Use strong, random secrets (64+ characters)
3. **HTTPS**: Always use HTTPS in production
4. **Updates**: Keep dependencies updated regularly
5. **Monitoring**: Monitor logs for suspicious activity

### Reporting Security Issues

If you discover a security vulnerability, please email: security@yourdomain.com

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `perf:` Performance improvements
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **GitHub Copilot** - *Initial development*
- **LMS Development Team** - *Ongoing maintenance*

---

## 🙏 Acknowledgments

- Express.js community
- MongoDB team
- All contributors and maintainers

---

## 📞 Support

For support, email support@yourdomain.com or join our Slack channel.

---

## 📈 Roadmap

- [ ] Mobile app integration (REST API client)
- [ ] Real-time notifications (Socket.io)
- [ ] Analytics dashboard
- [ ] Payment integration for fees
- [ ] Attendance tracking
- [ ] Library management
- [ ] Parent portal
- [ ] SMS/Email notifications

---

**Last Updated**: December 18, 2025  
**Version**: 1.0.0  
**Status**: Production Ready ✅
- `mongoose`: MongoDB object modeling tool designed to work in an asynchronous environment.

And the following development dependencies:

- `morgan`: HTTP request logger middleware for Node.js.
- `nodemon`: A utility that will monitor for any changes in your source and automatically restart your server.

## Installation

Before installing, make sure you have Node.js and npm (Node Package Manager) installed on your system. You can download them from [Node.js official website](https://nodejs.org/).

1. Clone the repository to your local machine.

2. Install the dependencies:
```bash
npm install
```

3. **Environment Configuration**

Create a `.env` file in the root directory by copying the example file:
```bash
cp .env.example .env
```

Edit the `.env` file and configure the following **required** environment variables:

```bash
# Database Configuration (REQUIRED)
MONGO_URL=your_mongodb_connection_string

# JWT Configuration (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRY=5d

# Server Configuration (REQUIRED)
PORT=8082
NODE_ENV=development
```

**Important Security Notes:**
- Never commit the `.env` file to version control
- Generate a strong JWT secret using: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- The JWT_SECRET must be at least 32 characters long
- Keep your MongoDB credentials secure

4. **Removing .env from Git History (if previously committed)**

If you've accidentally committed the `.env` file to git history, remove it using:
```bash
# Remove from current commit
git rm --cached .env

# To remove from entire git history (CAUTION: This rewrites history)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (coordinate with team first!)
git push origin --force --all
```

**Alternative using BFG Repo-Cleaner (Recommended):**
```bash
# Install BFG
brew install bfg  # macOS
# or download from https://rtyley.github.io/bfg-repo-cleaner/

# Remove .env from history
bfg --delete-files .env

# Clean up
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

## Running the Application
To start the application, you can use the following npm scripts defined in the package.json:

- To start the server with node:
```bash
npm start
```

- To start the server with nodemon for development (auto-restarts the server on file changes):
```bash
npm run server
```

## Setting up Postman
The API is built using Express.js and serves a RESTful JSON API. You can interact with it through a tool like Postman. I will provide the public API for my postman collection for this project if you would like to pull it.

## Setting up MongoDB
You can use either a local MongoDB installation or MongoDB Atlas cloud service.

### Local MongoDB Installation (Recommended for Development)

#### macOS (using Homebrew)
```bash
# Install MongoDB Community Edition
brew install mongodb-community@8.0

# Start MongoDB service
brew services start mongodb/brew/mongodb-community@8.0

# Verify MongoDB is running
brew services list | grep mongodb

# Test connection
mongosh --eval "db.version()"
```

#### Linux (Ubuntu/Debian)
```bash
# Import MongoDB GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-8.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Windows
1. Download MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the setup wizard
3. MongoDB will run as a Windows service automatically

#### Configuration for Local Development
Create a `.env.local` file for local development:
```bash
cp .env.example .env.local
```

Update `MONGO_URL` in `.env.local`:
```env
MONGO_URL=mongodb://localhost:27017/lms_db
```

#### Testing Local Connection
```bash
# Use the provided test script
node scripts/test-db-connection.js .env.local
```

### Using MongoDB Atlas (Cloud)
1. Create an account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier available)
3. Create a database user with password
4. Add your IP address to the IP Access List (or use 0.0.0.0/0 for development)
5. Get your connection string from the "Connect" button
6. Update `.env` with your Atlas connection string:
```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/lms_db?retryWrites=true&w=majority
```

### Managing Multiple Environments
- `.env` - Production/Atlas credentials (DO NOT commit)
- `.env.local` - Local MongoDB for development (DO NOT commit)
- `.env.example` - Template with all required variables (safe to commit)

Switch between environments by using different env files or updating `MONGO_URL` in your active `.env` file.

### Configuring the Application

**Environment variables are now managed through the `.env` file created during installation.**

All required environment variables are validated on startup. If any required variable is missing, the application will fail to start with a clear error message indicating which variables need to be configured.

Refer to the `.env.example` file for a complete list of available configuration options.

## Author
Adam Lopez

## License
This project is licensed under the ISC License.

This README section provides a comprehensive guide for potential contributors or users of your LMS System, including how to set it up, run it, and connect it with a MongoDB database. Adjustments can be made based on your specific repository URL or any additional steps you may require.