import bcrypt from 'bcryptjs';
import { validatePassword } from './passwordValidator';

/**
 * Hash password with validation
 * @param password - Plain text password
 * @returns Hashed password
 * @throws Error if password doesn't meet requirements
 */
export const hashPassword = async (password: string): Promise<string> => {
  // Validate password strength
  const validation = validatePassword(password);

  if (!validation.isValid) {
    const error = new Error('Password does not meet security requirements') as any;
    error.validationErrors = validation.errors;
    error.statusCode = 400;
    throw error;
  }

  // Create salt and hash
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  return hash;
};

/**
 * Check if password matches hash
 * @param password - Plain text password
 * @param hash - Hashed password
 * @returns True if password matches
 */
export const isPassMatched = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
