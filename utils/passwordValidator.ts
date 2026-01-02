import { PasswordValidationResult, PasswordStrength } from '../types/auth-types';

/**
 * Password validation configuration
 * Following OWASP password guidelines
 */
export const passwordRequirements = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
};

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Validation result with errors and strength
 */
export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];

  if (!password) {
    return {
      isValid: false,
      errors: ['Password is required'],
      strength: 'Very Weak',
      score: 0,
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
    errors.push(
      'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>_-+=[]\\\/`~;\')'
    );
  }

  // Check for common passwords
  const commonPasswords = [
    'password',
    'password123',
    '12345678',
    'qwerty',
    'abc123',
    'password1',
    '123456789',
    'letmein',
    'welcome',
    'global-admin',
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a more unique password');
  }

  // Check for repeating characters (e.g., "aaaa")
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Password should not contain more than 3 repeating characters');
  }

  const score = getPasswordStrength(password);
  const strength = getPasswordStrengthLabel(password);

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score,
  };
};

/**
 * Validate password confirmation
 * @param password - Original password
 * @param confirmPassword - Confirmation password
 * @returns Validation result
 */
export const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string
): { isValid: boolean; errors: string[] } => {
  if (!confirmPassword) {
    return {
      isValid: false,
      errors: ['Password confirmation is required'],
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      errors: ['Passwords do not match'],
    };
  }

  return {
    isValid: true,
    errors: [],
  };
};

/**
 * Get password strength score (0-4)
 * @param password - Password to score
 * @returns Strength score: 0=very weak, 1=weak, 2=fair, 3=good, 4=strong
 */
export const getPasswordStrength = (password: string): number => {
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
 * @param password - Password to evaluate
 * @returns Strength label
 */
export const getPasswordStrengthLabel = (password: string): PasswordStrength => {
  const score = getPasswordStrength(password);
  const labels: PasswordStrength[] = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return labels[score] || 'Very Weak';
};
