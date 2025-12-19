/**
 * Password Security Verification Tests
 * Tests for Phase 1.3: Password Security
 */

// Load environment variables first
require('dotenv-safe').config({
    allowEmptyValues: true,
    example: './.env.example'
});

const { 
    validatePassword, 
    validatePasswordConfirmation,
    getPasswordStrength,
    getPasswordStrengthLabel 
} = require('./utils/passwordValidator');

console.log('=== Password Security Verification Tests ===\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
    totalTests++;
    try {
        fn();
        console.log(`✅ PASSED: ${name}`);
        passedTests++;
        return true;
    } catch (error) {
        console.log(`❌ FAILED: ${name}`);
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

// Test 1: Weak passwords are rejected
test('Weak password (too short) is rejected', () => {
    const result = validatePassword('abc');
    if (result.isValid) throw new Error('Short password was accepted');
    if (!result.errors.some(e => e.includes('8 characters'))) {
        throw new Error('Length error not reported');
    }
});

// Test 2: Password without uppercase is rejected
test('Password without uppercase is rejected', () => {
    const result = validatePassword('password123!');
    if (result.isValid) throw new Error('Password without uppercase was accepted');
    if (!result.errors.some(e => e.includes('uppercase'))) {
        throw new Error('Uppercase error not reported');
    }
});

// Test 3: Password without lowercase is rejected
test('Password without lowercase is rejected', () => {
    const result = validatePassword('PASSWORD123!');
    if (result.isValid) throw new Error('Password without lowercase was accepted');
    if (!result.errors.some(e => e.includes('lowercase'))) {
        throw new Error('Lowercase error not reported');
    }
});

// Test 4: Password without number is rejected
test('Password without number is rejected', () => {
    const result = validatePassword('Password!');
    if (result.isValid) throw new Error('Password without number was accepted');
    if (!result.errors.some(e => e.includes('number'))) {
        throw new Error('Number error not reported');
    }
});

// Test 5: Password without special character is rejected
test('Password without special character is rejected', () => {
    const result = validatePassword('Password123');
    if (result.isValid) throw new Error('Password without special char was accepted');
    if (!result.errors.some(e => e.includes('special'))) {
        throw new Error('Special character error not reported');
    }
});

// Test 6: Common passwords are rejected
test('Common password is rejected', () => {
    const result = validatePassword('password123');
    if (result.isValid) throw new Error('Common password was accepted');
    if (!result.errors.some(e => e.includes('common'))) {
        throw new Error('Common password error not reported');
    }
});

// Test 7: Repeating characters are rejected
test('Password with repeating characters is rejected', () => {
    const result = validatePassword('Passssss1!');
    if (result.isValid) throw new Error('Password with repeating chars was accepted');
    if (!result.errors.some(e => e.includes('repeating'))) {
        throw new Error('Repeating character error not reported');
    }
});

// Test 8: Strong password is accepted
test('Strong password is accepted', () => {
    const result = validatePassword('MySecure@Pass123');
    if (!result.isValid) {
        throw new Error(`Strong password rejected: ${result.errors.join(', ')}`);
    }
    if (result.errors.length > 0) {
        throw new Error('Strong password has validation errors');
    }
});

// Test 9: Password confirmation mismatch is rejected
test('Password confirmation mismatch is rejected', () => {
    const result = validatePasswordConfirmation('Password123!', 'Password456!');
    if (result.isValid) throw new Error('Mismatched passwords were accepted');
    if (!result.errors.some(e => e.includes('do not match'))) {
        throw new Error('Mismatch error not reported');
    }
});

// Test 10: Password confirmation match is accepted
test('Password confirmation match is accepted', () => {
    const result = validatePasswordConfirmation('Password123!', 'Password123!');
    if (!result.isValid) {
        throw new Error(`Matching passwords rejected: ${result.errors.join(', ')}`);
    }
});

// Test 11: Password strength scoring works
test('Password strength scoring works', () => {
    const weakScore = getPasswordStrength('abc');
    const strongScore = getPasswordStrength('MyVerySecure@Pass123!');
    
    if (weakScore >= strongScore) {
        throw new Error(`Weak password scored ${weakScore}, strong scored ${strongScore}`);
    }
    
    console.log(`   Weak: ${weakScore}/4, Strong: ${strongScore}/4`);
});

// Test 12: Password strength labels work
test('Password strength labels work', () => {
    const weakLabel = getPasswordStrengthLabel('abc');
    const strongLabel = getPasswordStrengthLabel('MyVerySecure@Pass123!');
    
    const validLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    
    if (!validLabels.includes(weakLabel)) {
        throw new Error(`Invalid weak label: ${weakLabel}`);
    }
    
    if (!validLabels.includes(strongLabel)) {
        throw new Error(`Invalid strong label: ${strongLabel}`);
    }
    
    console.log(`   Weak: "${weakLabel}", Strong: "${strongLabel}"`);
});

// Test 13: Multiple validation errors are reported
test('Multiple validation errors are reported', () => {
    const result = validatePassword('abc');
    if (result.errors.length < 4) {
        throw new Error(`Expected at least 4 errors, got ${result.errors.length}`);
    }
    console.log(`   Reported ${result.errors.length} errors`);
});

// Test 14: Password requirements are exported
test('Password requirements are exported', () => {
    const { passwordRequirements } = require('./utils/passwordValidator');
    if (!passwordRequirements.minLength) {
        throw new Error('minLength not defined');
    }
    if (passwordRequirements.minLength !== 8) {
        throw new Error(`minLength should be 8, got ${passwordRequirements.minLength}`);
    }
    console.log(`   Min length: ${passwordRequirements.minLength}`);
});

// Test 15: HashPassword validation integration
test('HashPassword enforces validation', async () => {
    const { hashPassword } = require('./utils/helpers');
    
    try {
        await hashPassword('weak');
        throw new Error('Weak password was hashed without validation');
    } catch (error) {
        if (!error.validationErrors) {
            throw new Error('Expected validationErrors property on error');
        }
        if (!Array.isArray(error.validationErrors)) {
            throw new Error('validationErrors should be an array');
        }
        console.log(`   Caught ${error.validationErrors.length} validation errors`);
    }
});

// Test 16: Strong password can be hashed
test('Strong password can be hashed', async () => {
    const { hashPassword } = require('./utils/helpers');
    
    const hash = await hashPassword('StrongPass123!');
    if (!hash || typeof hash !== 'string') {
        throw new Error('Hash not generated');
    }
    if (hash.length < 50) {
        throw new Error('Hash seems too short');
    }
    console.log(`   Hash length: ${hash.length} characters`);
});

// Test 17: Password controller functions exist
test('Password controller files exist', () => {
    const fs = require('fs');
    const path = require('path');
    
    const passwordCtrlPath = path.join(__dirname, 'controller/auth/passwordCtrl.js');
    const passwordRoutesPath = path.join(__dirname, 'routes/auth/passwordRoutes.js');
    
    if (!fs.existsSync(passwordCtrlPath)) {
        throw new Error('passwordCtrl.js does not exist');
    }
    
    if (!fs.existsSync(passwordRoutesPath)) {
        throw new Error('passwordRoutes.js does not exist');
    }
    
    // Check that controller has the required function names
    const ctrlContent = fs.readFileSync(passwordCtrlPath, 'utf8');
    const functions = ['changePassword', 'forgotPassword', 'resetPassword', 'validatePasswordStrength'];
    
    functions.forEach(fn => {
        if (!ctrlContent.includes(`exports.${fn}`)) {
            throw new Error(`${fn} export not found in controller`);
        }
    });
    
    console.log(`   All ${functions.length} functions defined`);
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passedTests}/${totalTests}`);
console.log(`Failed: ${totalTests - passedTests}/${totalTests}`);

if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed');
    process.exit(1);
}
