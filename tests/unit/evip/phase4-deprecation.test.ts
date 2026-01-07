/**
 * EVIP Phase 4: Deprecation Middleware Tests
 * 
 * Tests for the deprecation middleware that adds HTTP headers
 * to deprecated endpoints to warn API consumers.
 */

import { Request, Response, NextFunction } from 'express';
import { deprecatedEndpoint } from '../../../middlewares/deprecation';

// Mock Express objects
const mockRequest = () => {
  return {
    method: 'POST',
    path: '/api/v1/department-resources/programs',
    originalUrl: '/api/v1/department-resources/programs'
  } as Request;
};

const mockResponse = () => {
  const res = {} as Response;
  res.setHeader = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn() as NextFunction;

describe('EVIP Phase 4: Deprecation Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.warn to prevent test output noise
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('deprecatedEndpoint middleware', () => {
    it('should set Deprecation header with correct date format', () => {
      const middleware = deprecatedEndpoint('/api/v1/programs', '2026-06-01');
      const req = mockRequest();
      const res = mockResponse();
      
      middleware(req, res, mockNext);
      
      expect(res.setHeader).toHaveBeenCalledWith(
        'Deprecation',
        expect.stringContaining('2026-06-01')
      );
    });

    it('should set Sunset header with removal date', () => {
      const middleware = deprecatedEndpoint('/api/v1/programs', '2026-06-01');
      const req = mockRequest();
      const res = mockResponse();
      
      middleware(req, res, mockNext);
      
      expect(res.setHeader).toHaveBeenCalledWith('Sunset', '2026-06-01');
    });

    it('should set Link header with successor version', () => {
      const middleware = deprecatedEndpoint('/api/v1/programs', '2026-06-01');
      const req = mockRequest();
      const res = mockResponse();
      
      middleware(req, res, mockNext);
      
      expect(res.setHeader).toHaveBeenCalledWith(
        'Link',
        '</api/v1/programs>; rel="successor-version"'
      );
    });

    it('should call next() to continue request processing', () => {
      const middleware = deprecatedEndpoint('/api/v1/programs', '2026-06-01');
      const req = mockRequest();
      const res = mockResponse();
      
      middleware(req, res, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log warning about deprecated endpoint usage', () => {
      const middleware = deprecatedEndpoint('/api/v1/programs', '2026-06-01');
      const req = mockRequest();
      const res = mockResponse();
      
      middleware(req, res, mockNext);
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Deprecated endpoint')
      );
    });

    it('should include request method and path in warning', () => {
      const middleware = deprecatedEndpoint('/api/v1/programs', '2026-06-01');
      const req = mockRequest();
      const res = mockResponse();
      
      middleware(req, res, mockNext);
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(/POST.*department-resources.*programs/)
      );
    });

    it('should work with different alternative endpoints', () => {
      const middleware = deprecatedEndpoint('/api/v1/courses/:id', '2026-09-15');
      const req = {
        method: 'PATCH',
        path: '/api/v1/department-resources/courses/123',
        originalUrl: '/api/v1/department-resources/courses/123'
      } as Request;
      const res = mockResponse();
      
      middleware(req, res, mockNext);
      
      expect(res.setHeader).toHaveBeenCalledWith(
        'Link',
        '</api/v1/courses/:id>; rel="successor-version"'
      );
      expect(res.setHeader).toHaveBeenCalledWith('Sunset', '2026-09-15');
    });
  });

  describe('Deprecation header standards compliance', () => {
    it('should follow RFC 8594 Deprecation header format', () => {
      const middleware = deprecatedEndpoint('/api/v1/programs', '2026-06-01');
      const req = mockRequest();
      const res = mockResponse();
      
      middleware(req, res, mockNext);
      
      // RFC 8594 specifies the format as: Deprecation: date="<date>"
      expect(res.setHeader).toHaveBeenCalledWith(
        'Deprecation',
        'date="2026-06-01"'
      );
    });

    it('should follow RFC 8288 Link header format', () => {
      const middleware = deprecatedEndpoint('/api/v1/auth/login', '2026-09-01');
      const req = mockRequest();
      const res = mockResponse();
      
      middleware(req, res, mockNext);
      
      // RFC 8288 Link header format
      expect(res.setHeader).toHaveBeenCalledWith(
        'Link',
        '</api/v1/auth/login>; rel="successor-version"'
      );
    });
  });
});
