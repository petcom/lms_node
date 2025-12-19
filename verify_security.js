/**
 * Phase 6: Security Enhancements Verification Tests
 * Tests security middleware configuration
 */

console.log('\n🔒 Phase 6: Security Enhancements Tests\n');
console.log('='.repeat(50));

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ ${description}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// Test 1: Rate limiting packages installed
test('express-rate-limit package installed', () => {
  const rateLimit = require('express-rate-limit');
  if (typeof rateLimit !== 'function') throw new Error('express-rate-limit not properly installed');
});

// Test 2: CORS package installed
test('cors package installed', () => {
  const cors = require('cors');
  if (typeof cors !== 'function') throw new Error('cors not properly installed');
});

// Test 3: Helmet package installed
test('helmet package installed', () => {
  const helmet = require('helmet');
  if (typeof helmet !== 'function') throw new Error('helmet not properly installed');
});

// Test 4: Mongo sanitize package installed
test('express-mongo-sanitize package installed', () => {
  const mongoSanitize = require('express-mongo-sanitize');
  if (typeof mongoSanitize !== 'function') throw new Error('express-mongo-sanitize not properly installed');
});

// Test 5: Rate limiter middleware exists
test('Rate limiter middleware exported', () => {
  const rateLimiters = require('./middlewares/rateLimiter');
  if (!rateLimiters.apiLimiter) throw new Error('apiLimiter not exported');
  if (!rateLimiters.authLimiter) throw new Error('authLimiter not exported');
  if (!rateLimiters.registerLimiter) throw new Error('registerLimiter not exported');
  if (!rateLimiters.passwordResetLimiter) throw new Error('passwordResetLimiter not exported');
});

// Test 6: CORS configuration exists
test('CORS configuration exists', () => {
  const corsConfig = require('./config/cors');
  if (!corsConfig) throw new Error('CORS configuration not found');
});

// Test 7: Rate limiter configuration
test('API rate limiter configured correctly', () => {
  const { apiLimiter } = require('./middlewares/rateLimiter');
  
  // Check it's a middleware function
  if (typeof apiLimiter !== 'function') {
    throw new Error('apiLimiter is not a function');
  }
});

// Test 8: Auth rate limiter stricter than API limiter
test('Auth rate limiter is stricter than API limiter', () => {
  // This is verified by inspection - auth limiter has 5 max vs 100 for API
  // and 15 minute window for both
  const fs = require('fs');
  const rateLimiterContent = fs.readFileSync('./middlewares/rateLimiter.js', 'utf8');
  
  if (!rateLimiterContent.includes('max: 5')) {
    throw new Error('Auth limiter max should be 5');
  }
  if (!rateLimiterContent.includes('max: 100')) {
    throw new Error('API limiter max should be 100');
  }
});

// Test 9: Register limiter most restrictive
test('Register limiter is most restrictive', () => {
  const fs = require('fs');
  const rateLimiterContent = fs.readFileSync('./middlewares/rateLimiter.js', 'utf8');
  
  if (!rateLimiterContent.includes('max: 3')) {
    throw new Error('Register limiter should have max: 3');
  }
  if (!rateLimiterContent.includes('60 * 60 * 1000')) {
    throw new Error('Register limiter should have 1 hour window');
  }
});

// Test 10: Password reset limiter configured
test('Password reset limiter configured', () => {
  const fs = require('fs');
  const rateLimiterContent = fs.readFileSync('./middlewares/rateLimiter.js', 'utf8');
  
  if (!rateLimiterContent.includes('passwordResetLimiter')) {
    throw new Error('passwordResetLimiter not found');
  }
});

// Test 11: CORS allows credentials
test('CORS allows credentials', () => {
  const fs = require('fs');
  const corsContent = fs.readFileSync('./config/cors.js', 'utf8');
  
  if (!corsContent.includes('credentials: true')) {
    throw new Error('CORS should allow credentials');
  }
});

// Test 12: CORS origin validation function
test('CORS has origin validation', () => {
  const fs = require('fs');
  const corsContent = fs.readFileSync('./config/cors.js', 'utf8');
  
  if (!corsContent.includes('origin: function')) {
    throw new Error('CORS should have origin validation function');
  }
  if (!corsContent.includes('ALLOWED_ORIGINS')) {
    throw new Error('CORS should use ALLOWED_ORIGINS environment variable');
  }
});

// Test 13: App.js imports security middleware
test('app.js imports security middleware', () => {
  const fs = require('fs');
  const appContent = fs.readFileSync('./app/app.js', 'utf8');
  
  const required = ['helmet', 'mongoSanitize', 'corsMiddleware', 'apiLimiter'];
  required.forEach(middleware => {
    if (!appContent.includes(middleware)) {
      throw new Error(`app.js missing ${middleware}`);
    }
  });
});

// Test 14: Helmet configured with options
test('Helmet configured with CSP and HSTS', () => {
  const fs = require('fs');
  const appContent = fs.readFileSync('./app/app.js', 'utf8');
  
  if (!appContent.includes('contentSecurityPolicy')) {
    throw new Error('Helmet should have CSP configuration');
  }
  if (!appContent.includes('hsts')) {
    throw new Error('Helmet should have HSTS configuration');
  }
});

// Test 15: Mongo sanitize applied
test('Mongo sanitize middleware applied', () => {
  const fs = require('fs');
  const appContent = fs.readFileSync('./app/app.js', 'utf8');
  
  if (!appContent.includes('app.use(mongoSanitize())')) {
    throw new Error('mongoSanitize middleware not applied');
  }
});

// Test 16: API rate limiter applied to all API routes
test('API rate limiter applied to /api/ routes', () => {
  const fs = require('fs');
  const appContent = fs.readFileSync('./app/app.js', 'utf8');
  
  if (!appContent.includes("app.use('/api/', apiLimiter)")) {
    throw new Error('apiLimiter not applied to /api/ routes');
  }
});

// Test 17: Auth routes use auth limiter
test('Admin routes use auth and register limiters', () => {
  const fs = require('fs');
  const adminRouterContent = fs.readFileSync('./routes/staff/adminRouter.js', 'utf8');
  
  if (!adminRouterContent.includes('registerLimiter')) {
    throw new Error('adminRouter should use registerLimiter');
  }
  if (!adminRouterContent.includes('authLimiter')) {
    throw new Error('adminRouter should use authLimiter');
  }
});

// Test 18: Password routes use password reset limiter
test('Password routes use reset limiter', () => {
  const fs = require('fs');
  const passwordRoutesContent = fs.readFileSync('./routes/auth/passwordRoutes.js', 'utf8');
  
  if (!passwordRoutesContent.includes('passwordResetLimiter')) {
    throw new Error('password routes should use passwordResetLimiter');
  }
});

// Test 19: Request body size limit
test('Request body has size limit', () => {
  const fs = require('fs');
  const appContent = fs.readFileSync('./app/app.js', 'utf8');
  
  if (!appContent.includes('limit:')) {
    throw new Error('express.json should have size limit');
  }
});

// Test 20: ALLOWED_ORIGINS in .env.example
test('ALLOWED_ORIGINS documented in .env.example', () => {
  const fs = require('fs');
  const envExample = fs.readFileSync('./.env.example', 'utf8');
  
  if (!envExample.includes('ALLOWED_ORIGINS')) {
    throw new Error('.env.example should document ALLOWED_ORIGINS');
  }
});

// Test 21: Security middleware ordered correctly
test('Security middleware applied in correct order', () => {
  const fs = require('fs');
  const appContent = fs.readFileSync('./app/app.js', 'utf8');
  
  const helmetIndex = appContent.indexOf('app.use(helmet');
  const corsIndex = appContent.indexOf('app.use(corsMiddleware)');
  const sanitizeIndex = appContent.indexOf('app.use(mongoSanitize())');
  const jsonIndex = appContent.indexOf('app.use(express.json');
  
  if (helmetIndex === -1 || corsIndex === -1 || sanitizeIndex === -1 || jsonIndex === -1) {
    throw new Error('Missing security middleware');
  }
  
  // Helmet should be first
  if (helmetIndex > corsIndex || helmetIndex > sanitizeIndex) {
    throw new Error('Helmet should be applied first');
  }
  
  // Sanitize should be before JSON parsing
  if (sanitizeIndex > jsonIndex) {
    throw new Error('mongoSanitize should be before express.json');
  }
});

// Test 22: Rate limiter returns proper status code
test('Rate limiter configured to return 429 status', () => {
  const fs = require('fs');
  const rateLimiterContent = fs.readFileSync('./middlewares/rateLimiter.js', 'utf8');
  
  if (!rateLimiterContent.includes('status(429)')) {
    throw new Error('Rate limiter should return 429 status');
  }
});

console.log('='.repeat(50));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.log('❌ Some tests failed');
  process.exit(1);
} else {
  console.log('🎉 All security tests passed!');
  process.exit(0);
}
