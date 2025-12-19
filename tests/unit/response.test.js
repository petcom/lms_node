/**
 * Unit Tests for utils/response.js
 * Tests standardized API response utilities
 */

const {
  successResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse
} = require('../../utils/response');

describe('utils/response.js', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('successResponse', () => {
    it('should return success response with default status 200', () => {
      const data = { id: 1, name: 'Test' };
      successResponse(mockRes, { data });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Success',
        data
      });
    });

    it('should return success response with custom message', () => {
      const data = { id: 1 };
      const message = 'Custom success message';
      successResponse(mockRes, { data, message });

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message,
        data
      });
    });

    it('should return success response with custom status code', () => {
      const data = { id: 1 };
      const statusCode = 202;
      successResponse(mockRes, { data, statusCode });

      expect(mockRes.status).toHaveBeenCalledWith(202);
    });
  });

  describe('paginatedResponse', () => {
    it('should return paginated response with metadata', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 1, limit: 10, total: 50 };
      
      paginatedResponse(mockRes, { data, pagination });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Success',
        data,
        pagination: {
          page: 1,
          limit: 10,
          total: 50,
          totalPages: 5,
          hasNextPage: true,
          hasPrevPage: false,
          nextPage: 2,
          prevPage: null
        }
      });
    });

    it('should calculate pagination metadata correctly for last page', () => {
      const data = [{ id: 1 }];
      const pagination = { page: 5, limit: 10, total: 50 };
      
      paginatedResponse(mockRes, { data, pagination });

      const call = mockRes.json.mock.calls[0][0];
      expect(call.pagination.hasNextPage).toBe(false);
      expect(call.pagination.hasPrevPage).toBe(true);
      expect(call.pagination.nextPage).toBe(null);
      expect(call.pagination.prevPage).toBe(4);
    });

    it('should calculate pagination metadata correctly for middle page', () => {
      const data = [{ id: 1 }];
      const pagination = { page: 3, limit: 10, total: 50 };
      
      paginatedResponse(mockRes, { data, pagination });

      const call = mockRes.json.mock.calls[0][0];
      expect(call.pagination.hasNextPage).toBe(true);
      expect(call.pagination.hasPrevPage).toBe(true);
      expect(call.pagination.nextPage).toBe(4);
      expect(call.pagination.prevPage).toBe(2);
    });

    it('should handle string page and limit values', () => {
      const data = [{ id: 1 }];
      const pagination = { page: '2', limit: '10', total: 50 };
      
      paginatedResponse(mockRes, { data, pagination });

      const call = mockRes.json.mock.calls[0][0];
      expect(call.pagination.page).toBe(2);
      expect(call.pagination.limit).toBe(10);
    });
  });

  describe('createdResponse', () => {
    it('should return 201 status code', () => {
      const data = { id: 1, name: 'New Resource' };
      createdResponse(mockRes, { data });

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should use default created message', () => {
      const data = { id: 1 };
      createdResponse(mockRes, { data });

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Resource created successfully',
        data
      });
    });

    it('should accept custom message', () => {
      const data = { id: 1 };
      const message = 'User created successfully';
      createdResponse(mockRes, { data, message });

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message,
        data
      });
    });
  });

  describe('noContentResponse', () => {
    it('should return 204 status code', () => {
      noContentResponse(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should not return any content', () => {
      noContentResponse(mockRes);

      expect(mockRes.send).toHaveBeenCalledWith();
    });
  });
});
