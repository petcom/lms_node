/**
 * User Schema Unit Tests
 * DCV-001: Test User.roles array, primaryRole, staffRoles
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../../model/Auth/User';

describe('User Schema (DCV-001)', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('roles array field', () => {
    it('should accept a single role in the roles array', async () => {
      const user = new User({
        email: 'test@example.com',
        passwordHash: 'hashedpassword123',
        roles: ['learner'],
      });
      await user.save();

      const found = await User.findById(user._id);
      expect(found?.roles).toEqual(['learner']);
    });

    it('should accept multiple roles in the roles array', async () => {
      const user = new User({
        email: 'multi@example.com',
        passwordHash: 'hashedpassword123',
        roles: ['staff', 'learner'],
      });
      await user.save();

      const found = await User.findById(user._id);
      expect(found?.roles).toEqual(expect.arrayContaining(['staff', 'learner']));
      expect(found?.roles).toHaveLength(2);
    });

    it('should reject invalid role values', async () => {
      const user = new User({
        email: 'invalid@example.com',
        passwordHash: 'hashedpassword123',
        roles: ['invalid-role' as any],
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should accept all valid role enum values', async () => {
      const validRoles = ['global-admin', 'staff', 'learner'];
      const user = new User({
        email: 'allroles@example.com',
        passwordHash: 'hashedpassword123',
        roles: validRoles,
      });
      await user.save();

      const found = await User.findById(user._id);
      expect(found?.roles).toHaveLength(3);
      expect(found?.roles).toContain('global-admin');
      expect(found?.roles).toContain('staff');
      expect(found?.roles).toContain('learner');
    });

    it('should require at least one role', async () => {
      const user = new User({
        email: 'norole@example.com',
        passwordHash: 'hashedpassword123',
        roles: [],
      });

      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('primaryRole field', () => {
    it('should automatically set primaryRole from roles[0] if not provided', async () => {
      const user = new User({
        email: 'auto-primary@example.com',
        passwordHash: 'hashedpassword123',
        roles: ['staff', 'learner'],
      });
      await user.save();

      const found = await User.findById(user._id);
      expect(found?.primaryRole).toBe('staff');
    });

    it('should allow explicit primaryRole override', async () => {
      const user = new User({
        email: 'explicit-primary@example.com',
        passwordHash: 'hashedpassword123',
        roles: ['staff', 'learner'],
        primaryRole: 'learner',
      });
      await user.save();

      const found = await User.findById(user._id);
      expect(found?.primaryRole).toBe('learner');
    });

    it('should validate that primaryRole is in roles array', async () => {
      const user = new User({
        email: 'bad-primary@example.com',
        passwordHash: 'hashedpassword123',
        roles: ['staff'],
        primaryRole: 'learner', // Not in roles array
      });

      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('staffRoles field (renamed from subroles)', () => {
    it('should accept staffRoles array for staff users', async () => {
      const user = new User({
        email: 'staff-roles@example.com',
        passwordHash: 'hashedpassword123',
        roles: ['staff'],
        staffRoles: ['instructor', 'department-admin'],
      });
      await user.save();

      const found = await User.findById(user._id);
      expect(found?.staffRoles).toEqual(['instructor', 'department-admin']);
    });

    it('should allow empty staffRoles array', async () => {
      const user = new User({
        email: 'no-staff-roles@example.com',
        passwordHash: 'hashedpassword123',
        roles: ['staff'],
        staffRoles: [],
      });
      await user.save();

      const found = await User.findById(user._id);
      expect(found?.staffRoles).toEqual([]);
    });

    it('should allow undefined staffRoles', async () => {
      const user = new User({
        email: 'undefined-staff@example.com',
        passwordHash: 'hashedpassword123',
        roles: ['learner'],
      });
      await user.save();

      const found = await User.findById(user._id);
      expect(found?.staffRoles).toBeUndefined();
    });
  });

  describe('indexes', () => {
    it('should have index on roles field', async () => {
      // Create a user first to ensure collection exists
      const user = new User({
        email: 'index-test@example.com',
        passwordHash: 'hashedpassword123',
        roles: ['learner'],
      });
      await user.save();
      
      // Ensure indexes are created
      await User.ensureIndexes();
      
      // Check schema indexes instead of collection indexes
      const schemaIndexes = User.schema.indexes();
      const hasRolesIndex = schemaIndexes.some((indexDef: any[]) => {
        const fields = indexDef[0];
        return 'roles' in fields;
      });
      expect(hasRolesIndex).toBe(true);
    });
  });

  describe('backward compatibility - role field removed', () => {
    it('should not have the legacy role field', async () => {
      const user = new User({
        email: 'legacy@example.com',
        passwordHash: 'hashedpassword123',
        roles: ['learner'],
      });
      await user.save();

      const found = await User.findById(user._id).lean();
      expect(found).not.toHaveProperty('role');
    });

    it('should not have the legacy subroles field', async () => {
      const user = new User({
        email: 'legacy-sub@example.com',
        passwordHash: 'hashedpassword123',
        roles: ['staff'],
        staffRoles: ['instructor'],
      });
      await user.save();

      const found = await User.findById(user._id).lean();
      expect(found).not.toHaveProperty('subroles');
    });
  });
});
