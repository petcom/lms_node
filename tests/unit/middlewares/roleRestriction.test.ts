/**
 * Role Restriction Middleware Tests
 * DCV-008: Test roleRestriction with roles array support
 */
import { Request, Response, NextFunction } from 'express';
import roleRestriction, { isAdmin, isInstructorOrAdmin, isLearner, requireStaffRole } from '../../../middlewares/roleRestriction';
import { AuthenticationError, AuthorizationError } from '../../../utils/errors';

describe('roleRestriction Middleware (DCV-008)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: jest.Mock<NextFunction>;

  beforeEach(() => {
    mockReq = {};
    mockRes = {};
    nextFn = jest.fn();
  });

  describe('roles array support', () => {
    it('should allow access when user has one of the required roles in roles array', () => {
      mockReq.userAuth = {
        _id: 'user123',
        roles: ['staff', 'learner'],
        role: 'staff',
      } as any;

      const middleware = roleRestriction('staff');
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledWith();
      expect(nextFn).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should allow access when user has global-admin in roles array', () => {
      mockReq.userAuth = {
        _id: 'admin123',
        roles: ['global-admin', 'staff'],
        role: 'global-admin',
      } as any;

      const middleware = roleRestriction('global-admin');
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should deny access when user has no matching roles', () => {
      mockReq.userAuth = {
        _id: 'learner123',
        roles: ['learner'],
        role: 'learner',
      } as any;

      const middleware = roleRestriction('global-admin', 'staff');
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });

    it('should fall back to legacy role field when roles array is missing', () => {
      mockReq.userAuth = {
        _id: 'legacy123',
        role: 'staff',
        // roles array intentionally missing
      } as any;

      const middleware = roleRestriction('staff');
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledWith();
    });
  });

  describe('multi-role user access', () => {
    it('should allow staff+learner user to access staff routes', () => {
      mockReq.userAuth = {
        _id: 'multi123',
        roles: ['staff', 'learner'],
        primaryRole: 'staff',
      } as any;

      const middleware = roleRestriction('staff');
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should allow staff+learner user to access learner routes', () => {
      mockReq.userAuth = {
        _id: 'multi123',
        roles: ['staff', 'learner'],
        primaryRole: 'staff',
      } as any;

      const middleware = roleRestriction('learner');
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should allow global-admin+staff user to access any allowed route', () => {
      mockReq.userAuth = {
        _id: 'super123',
        roles: ['global-admin', 'staff'],
        primaryRole: 'global-admin',
      } as any;

      // Should access global-admin route
      roleRestriction('global-admin')(mockReq as Request, mockRes as Response, nextFn);
      expect(nextFn).toHaveBeenCalledWith();

      nextFn.mockClear();

      // Should also access staff route
      roleRestriction('staff')(mockReq as Request, mockRes as Response, nextFn);
      expect(nextFn).toHaveBeenCalledWith();
    });
  });

  describe('authentication checks', () => {
    it('should return AuthenticationError when userAuth is missing', () => {
      mockReq.userAuth = undefined;

      const middleware = roleRestriction('staff');
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
  });

  describe('shorthand middlewares', () => {
    it('isAdmin should only allow global-admin role', () => {
      mockReq.userAuth = {
        _id: 'admin123',
        roles: ['global-admin'],
      } as any;

      isAdmin(mockReq as Request, mockRes as Response, nextFn);
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('isInstructorOrAdmin should allow staff or global-admin', () => {
      mockReq.userAuth = {
        _id: 'staff123',
        roles: ['staff'],
      } as any;

      isInstructorOrAdmin(mockReq as Request, mockRes as Response, nextFn);
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('isLearner should allow learner role', () => {
      mockReq.userAuth = {
        _id: 'learner123',
        roles: ['learner'],
      } as any;

      isLearner(mockReq as Request, mockRes as Response, nextFn);
      expect(nextFn).toHaveBeenCalledWith();
    });
  });

  describe('requireStaffRole', () => {
    it('should allow access when user has required staffRole', () => {
      mockReq.userAuth = {
        _id: 'staff123',
        roles: ['staff'],
        staffRoles: ['instructor', 'department-admin'],
      } as any;

      const middleware = requireStaffRole('instructor');
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should deny access when user lacks required staffRole', () => {
      mockReq.userAuth = {
        _id: 'staff123',
        roles: ['staff'],
        staffRoles: ['instructor'],
      } as any;

      const middleware = requireStaffRole('department-admin');
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });

    it('should bypass staffRole check for global-admin', () => {
      mockReq.userAuth = {
        _id: 'admin123',
        roles: ['global-admin'],
        staffRoles: [], // No staff roles
      } as any;

      const middleware = requireStaffRole('department-admin');
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledWith();
    });
  });

  describe('invalid role validation', () => {
    it('should throw error when invalid role is provided', () => {
      expect(() => {
        roleRestriction('invalid-role' as any);
      }).toThrow('Invalid role(s) provided to roleRestriction');
    });
  });
});
