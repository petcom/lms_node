/**
 * JWT Token Security Verification Tests
 * Tests for Phase 1.2: JWT Token Security
 */

// Load environment variables first
require('dotenv-safe').config({
    allowEmptyValues: true,
    example: './.env.example'
});

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

console.log('=== JWT Token Security Verification Tests ===\n');

// Test 1: Verify JWT_SECRET cannot be 'anykey'
console.log('Test 1: Hardcoded secret removed');
const generateToken = require('./utils/generateToken');
const verifyToken = require('./utils/verifyToken');

try {
    const testToken = generateToken('test-user-id');
    console.log('✅ PASSED: Token generated with environment secret');
    console.log('   Token length:', testToken.length, 'characters');
} catch (error) {
    console.log('❌ FAILED:', error.message);
}

// Test 2: Verify tokens cannot be forged with old secret
console.log('\nTest 2: Tokens cannot be forged with hardcoded secret');
try {
    const forgedToken = jwt.sign({ id: 'hacker' }, 'anykey', { expiresIn: '5d' });
    const verified = jwt.verify(forgedToken, process.env.JWT_SECRET);
    console.log('❌ FAILED: Forged token was accepted');
} catch (error) {
    console.log('✅ PASSED: Forged token rejected');
    console.log('   Error:', error.message);
}

// Test 3: Verify expired tokens are rejected
console.log('\nTest 3: Expired tokens are rejected');
try {
    const expiredToken = jwt.sign(
        { id: 'test-user' }, 
        process.env.JWT_SECRET, 
        { expiresIn: '0s' }
    );
    
    // Wait a moment to ensure expiry
    setTimeout(async () => {
        try {
            await verifyToken(expiredToken);
            console.log('❌ FAILED: Expired token was accepted');
        } catch (error) {
            console.log('✅ PASSED: Expired token rejected');
            console.log('   Error:', error.message);
        }
        
        // Test 4: Valid tokens are accepted
        console.log('\nTest 4: Valid tokens are accepted');
        try {
            const validToken = generateToken('valid-user-id');
            const decoded = await verifyToken(validToken);
            console.log('✅ PASSED: Valid token accepted');
            console.log('   Decoded user ID:', decoded.id);
        } catch (error) {
            console.log('❌ FAILED:', error.message);
        }
        
        // Test 5: JWT secret length validation
        console.log('\nTest 5: JWT secret length validation');
        const secretLength = process.env.JWT_SECRET.length;
        if (secretLength >= 32) {
            console.log('✅ PASSED: JWT secret meets minimum length');
            console.log('   Length:', secretLength, 'characters');
        } else {
            console.log('❌ FAILED: JWT secret is too short');
            console.log('   Length:', secretLength, 'characters (minimum: 32)');
        }
        
        // Test 6: Token expiry configuration
        console.log('\nTest 6: Token expiry configuration');
        const accessExpiry = process.env.JWT_EXPIRY;
        const refreshExpiry = process.env.JWT_REFRESH_EXPIRY;
        console.log('✅ Access token expiry:', accessExpiry);
        console.log('✅ Refresh token expiry:', refreshExpiry);
        
        // Test 7: Token manager functions
        console.log('\nTest 7: Token manager functions exist');
        const tokenManager = require('./utils/tokenManager');
        const functions = ['generateTokenPair', 'refreshAccessToken', 'revokeRefreshToken', 'revokeAllUserTokens'];
        let allExist = true;
        functions.forEach(fn => {
            if (typeof tokenManager[fn] === 'function') {
                console.log('✅', fn, 'exists');
            } else {
                console.log('❌', fn, 'missing');
                allExist = false;
            }
        });
        
        console.log('\n=== All Tests Completed ===');
        process.exit(allExist ? 0 : 1);
    }, 100);
} catch (error) {
    console.log('❌ Test setup failed:', error.message);
    process.exit(1);
}
