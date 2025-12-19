import jwt from 'jsonwebtoken';

/**
 * Generate a token for a user using jsonwebtoken
 * @param id - User ID to encode in the token
 * @returns JWT token
 */
const generateToken = (id: string): string => {
  const secret = process.env.JWT_SECRET;
  const expiry = process.env.JWT_EXPIRY || '5d';

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  return jwt.sign({ id }, secret, { expiresIn: expiry } as jwt.SignOptions) as string;
};

export default generateToken;
