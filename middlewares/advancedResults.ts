import { Request, Response, NextFunction } from 'express';
import { Model, PopulateOptions } from 'mongoose';

interface PaginationInfo {
  next?: {
    page: number;
    limit: number;
  };
  prev?: {
    page: number;
    limit: number;
  };
}

interface AdvancedResultsResponse<T> {
  total: number;
  pagination: PaginationInfo;
  results: number;
  status: string;
  message: string;
  data: T[];
}

/**
 * Advanced results middleware with pagination, filtering, and population
 * @param model - Mongoose model to query
 * @param populate - Optional populate options for referenced documents
 * @returns Express middleware function
 */
const advancedResults = <T>(
  model: Model<T>,
  populate?: PopulateOptions | PopulateOptions[],
  buildFilters?: (req: Request) => Record<string, any>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 2;
      const skip = (page - 1) * limit;

      const baseFilters = buildFilters ? buildFilters(req) : {};

      const filter: Record<string, any> = { ...baseFilters };

      if (req.query.name && typeof req.query.name === 'string') {
        filter.name = { $regex: req.query.name, $options: 'i' } as any;
      }

      let query = model.find(filter);
      if (populate) {
        query = query.populate(populate);
      }

      const total = await model.countDocuments(filter);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      const pagination: PaginationInfo = {};
      if (endIndex < total) {
        pagination.next = {
          page: page + 1,
          limit,
        };
      }
      if (startIndex > 0) {
        pagination.prev = {
          page: page - 1,
          limit,
        };
      }

      const AdvancedResults = await query.skip(skip).limit(limit);

      const response: AdvancedResultsResponse<T> = {
        total,
        pagination,
        results: AdvancedResults.length,
        status: 'success',
        message: 'Advanced Results fetched successfully',
        data: AdvancedResults,
      };

      res.results = response as any;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default advancedResults;
