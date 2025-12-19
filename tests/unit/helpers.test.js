/**
 * Unit Tests for utils/helpers.js
 * Tests password hashing and verification utilities
 */

const { hashPassword, isPassMatched } = require('../../utils/helpers');

describe('utils/helpers.js', () => {
  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'Test@1234';
      const hashed = await hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(50); // bcrypt hashes are ~60 chars
    });

    it('should reject password without uppercase', async () => {
      const password = 'test@1234';
      
      await expect(hashPassword(password)).rejects.toThrow('Password does not meet security requirements');
    });

    it('should reject password without lowercase', async () => {
      const password = 'TEST@1234';
      
      await expect(hashPassword(password)).rejects.toThrow('Password does not meet security requirements');
    });

    it('should reject password without number', async () => {
      const password = 'Test@abcd';
      
      await expect(hashPassword(password)).rejects.toThrow('Password does not meet security requirements');
    });

    it('should reject password without special character', async () => {
      const password = 'Test1234';
      
      await expect(hashPassword(password)).rejects.toThrow('Password does not meet security requirements');
    });

    it('should reject password shorter than 8 characters', async () => {
      const password = 'Te@12';
      
      await expect(hashPassword(password)).rejects.toThrow('Password does not meet security requirements');
    });

    it('should generate different hashes for same password', async () => {
      const password = 'Test@1234';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2); // bcrypt uses salt
    });
  });

  describe('isPassMatched', () => {
    it('should return true for matching password', async () => {
      const password = 'Test@1234';
      const hashed = await hashPassword(password);
      const isMatch = await isPassMatched(password, hashed);
      
      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'Test@1234';
      const wrongPassword = 'Wrong@1234';
      const hashed = await hashPassword(password);
      const isMatch = await isPassMatched(wrongPassword, hashed);
      
      expect(isMatch).toBe(false);
    });

    it('should return false for slightly different password', async () => {
      const password = 'Test@1234';
      const similarPassword = 'Test@1235';
      const hashed = await hashPassword(password);
      const isMatch = await isPassMatched(similarPassword, hashed);
      
      expect(isMatch).toBe(false);
    });

    it('should handle empty password', async () => {
      const password = 'Test@1234';
      const hashed = await hashPassword(password);
      const isMatch = await isPassMatched('', hashed);
      
      expect(isMatch).toBe(false);
    });
  });
});
