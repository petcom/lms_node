// Authentication and JWT type definitions
import { Types } from 'mongoose';
import { UserRole } from './models-types';

// Re-export UserRole for convenience
export { UserRole };

// JWT Payload Interface
// DCV-001: Support both legacy 'role' and new 'roles' array during migration
export interface JWTPayload {
  id: string | Types.ObjectId;
  role: UserRole;          // Primary role (for backward compatibility)
  roles?: UserRole[];      // All roles (new)
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
// DCV-001: Support both legacy 'role' and new 'roles' array for backward compatibility
export interface AuthenticatedUser {
  _id: Types.ObjectId;
  id: string;
  name: string;
  email: string;
  role: UserRole;              // Primary role (legacy, for backward compatibility)
  roles: UserRole[];           // All roles (new)
  primaryRole: UserRole;       // Default dashboard role (new)
  staffRoles?: string[];       // Renamed from subroles
  department?: Types.ObjectId;
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
