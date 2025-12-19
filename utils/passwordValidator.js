const validator = require('validator');

/**
 * Password validation configuration
 * Following OWASP password guidelines
 */
const passwordRequirements = {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
const validatePassword = (password) => {
    const errors = [];
    
    if (!password) {
        return { 
            isValid: false, 
            errors: ['Password is required'] 
        };
    }

    // Check minimum length
    if (password.length < passwordRequirements.minLength) {
        errors.push(`Password must be at least ${passwordRequirements.minLength} characters long`);
    }

    // Check for lowercase letters
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    // Check for uppercase letters
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    // Check for numbers
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    // Check for special characters
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>_-+=[]\\\/`~;\')');
    }

    // Check for common passwords (optional - can add more)
    const commonPasswords = [
        'password', 'password123', '12345678', 'qwerty', 'abc123',
        'password1', '123456789', 'letmein', 'welcome', 'admin'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('Password is too common. Please choose a more unique password');
    }

    // Check for repeating characters (e.g., "aaaa")
    if (/(.)\1{3,}/.test(password)) {
        errors.push('Password should not contain more than 3 repeating characters');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Validate password confirmation
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {object} { isValid: boolean, errors: string[] }
 */
const validatePasswordConfirmation = (password, confirmPassword) => {
    if (!confirmPassword) {
        return {
            isValid: false,
            errors: ['Password confirmation is required']
        };
    }

    if (password !== confirmPassword) {
        return {
            isValid: false,
            errors: ['Passwords do not match']
        };
    }

    return {
        isValid: true,
        errors: []
    };
};

/**
 * Get password strength score (0-4)
 * @param {string} password - Password to score
 * @returns {number} Strength score: 0=very weak, 1=weak, 2=fair, 3=good, 4=strong
 */
const getPasswordStrength = (password) => {
    let score = 0;

    if (!password) return 0;

    // Length bonus
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;

    // Character variety bonus
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(password)) score++;

    // Penalty for common patterns
    if (/^[a-zA-Z]+$/.test(password) || /^[0-9]+$/.test(password)) score--;
    if (/(.)\1{2,}/.test(password)) score--;

    return Math.max(0, Math.min(4, score));
};

/**
 * Get password strength label
 * @param {string} password - Password to evaluate
 * @returns {string} Strength label
 */
const getPasswordStrengthLabel = (password) => {
    const score = getPasswordStrength(password);
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return labels[score] || 'Very Weak';
};

module.exports = {
    validatePassword,
    validatePasswordConfirmation,
    getPasswordStrength,
    getPasswordStrengthLabel,
    passwordRequirements
};
