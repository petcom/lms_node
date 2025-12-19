// Authentication and JWT type definitions
import { Types } from 'mongoose';
import { UserRole } from './models';

// Re-export UserRole for convenience
export { UserRole };

// JWT Payload Interface
export interface JWTPayload {
  id: string | Types.ObjectId;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Refresh Token Payload
export interface RefreshTokenPayload extends JWTPayload {
  tokenId?: string;
}

// Token Pair returned after authentication
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
}

// Authenticated User (from req.userAuth)
export interface AuthenticatedUser {
  _id: Types.ObjectId;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  [key: string]: any;
}

// Password Validation Result
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: PasswordStrength;
  score: number;
}

// Password Strength Type
export type PasswordStrength = 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
