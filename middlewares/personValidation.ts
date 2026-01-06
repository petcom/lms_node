/**
 * Person Validation Middleware
 * DCV-002: Reusable pre-save validation to enforce User-Person linking
 *
 * This middleware ensures that person records (Admin, Staff, Learner)
 * can only be created when a corresponding User record exists with the same _id.
 * This enforces the shared _id pattern for User-to-Person linking.
 * 
 * IMPORTANT: Always create the User record FIRST, then create the person record
 * with the same _id. This middleware validates that pattern.
 */
import { Schema } from 'mongoose';
import User from '../model/Auth/User';

/**
 * Apply validation to ensure User exists before creating person record
 * @param schema - Mongoose schema to apply validation to
 */
export function requireUserExists(schema: Schema): void {
  schema.pre('save', async function (next) {
    // Only validate on new documents
    if (!this.isNew) {
      return next();
    }
    
    // Always validate that User exists with this _id
    try {
      const userExists = await User.exists({ _id: this._id });
      if (!userExists) {
        const modelName = (this.constructor as any).modelName || 'Person';
        throw new Error(
          `Cannot create ${modelName} record: ` +
            `No User exists with _id ${this._id}. Create User first.`
        );
      }
    } catch (error) {
      return next(error as Error);
    }
    next();
  });
}

export default requireUserExists;
