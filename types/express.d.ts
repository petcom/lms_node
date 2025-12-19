// Express type augmentation for custom properties
import { IAdmin } from './models';
import { ITeacher } from './models';
import { IStudent } from './models';

declare global {
  namespace Express {
    interface Request {
      userAuth?: IAdmin | ITeacher | IStudent;
      advancedResults?: {
        data: any[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          pages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      };
    }
  }
}

export {};
