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
const advancedResults = <T>(model: Model<T>, populate?: PopulateOptions | PopulateOptions[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let ModelQuery = model.find(); // return all data via query, then do pagination using mongoose
      const page = Number(req.query.page) || 1; // using number constructor, look for query params 'page'
      const limit = Number(req.query.limit) || 2; // using number constructor, look for query params 'limit'
      const skip = (page - 1) * limit; // page minus 1 times the limit
      const total = await model.countDocuments(); // get total records
      const startIndex = (page - 1) * limit; // start index of the current page
      const endIndex = page * limit; // end index of the current page

      // populate
      if (populate) {
        ModelQuery = ModelQuery.populate(populate);
      }

      // If the query string has the name property, search for the name
      if (req.query.name && typeof req.query.name === 'string') {
        // filtering/searching by name
        ModelQuery = ModelQuery.find({
          name: { $regex: req.query.name, $options: 'i' },
        } as any);
      }

      // pagination results
      const pagination: PaginationInfo = {};
      // add next
      if (endIndex < total) {
        pagination.next = {
          page: page + 1,
          limit,
        };
      }
      // add prev
      if (startIndex > 0) {
        pagination.prev = {
          page: page - 1,
          limit,
        };
      }

      const AdvancedResults = await ModelQuery.find().skip(skip).limit(limit);

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
