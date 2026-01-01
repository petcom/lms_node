// Express type augmentation for custom properties
import { IAdmin, IStaff, IStudent } from './models';

declare global {
  namespace Express {
    interface Request {
      // User authentication data
      userAuth?: IAdmin | IStaff | IStudent;

      // Department scoping info
      departmentScope?: {
        userDepartmentId?: string;
        accessibleDepartmentIds?: string[] | 'all';
      };

      // User type for multi-tenant auth
      userType?: 'admin' | 'teacher' | 'student';

      // JWT token from authorization header
      token?: string;

      // Advanced results data from pagination middleware
      results?: {
        total: number;
        pagination: {
          next?: {
            page: number;
            limit: number;
          };
          prev?: {
            page: number;
            limit: number;
          };
        };
        results: number;
        status: string;
        message: string;
        data: any[];
      };

      // Rate limit info from express-rate-limit
      rateLimit?: {
        limit: number;
        current: number;
        remaining: number;
        resetTime: number;
      };
    }

    interface Response {
      // Advanced results data for response
      results?: {
        total: number;
        pagination: {
          next?: {
            page: number;
            limit: number;
          };
          prev?: {
            page: number;
            limit: number;
          };
        };
        results: number;
        status: string;
        message: string;
        data: any[];
      };
    }
  }
}

export {};
