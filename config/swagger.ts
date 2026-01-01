/**
 * Swagger API Documentation Configuration
 * Provides OpenAPI/Swagger specification for the LMS API
 */

import swaggerJsdoc, { Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'School Management System (LMS) API',
      version: '1.0.0',
      description: 'RESTful API for School Learning Management System',
      contact: {
        name: 'API Support',
        email: 'support@lms.com',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: 'http://localhost:8082',
        description: 'Development server',
      },
      {
        url: 'http://localhost:8082',
        description: 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login endpoint',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success',
            },
            message: {
              type: 'string',
              example: 'Success message',
            },
            data: {
              type: 'object',
            },
          },
        },
        Admin: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@example.com',
            },
            role: {
              type: 'string',
              example: 'global-admin',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        AcademicYear: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: '2024-2025',
              pattern: '^\\d{4}-\\d{4}$',
            },
            fromYear: {
              type: 'string',
              format: 'date',
            },
            toYear: {
              type: 'string',
              format: 'date',
            },
            isCurrent: {
              type: 'boolean',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // SCORM Schemas
        ScormPackage: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            packageId: {
              type: 'string',
              example: 'PKG-ABC123',
            },
            title: {
              type: 'string',
              example: 'Introduction to JavaScript',
            },
            description: {
              type: 'string',
              example: 'Learn the fundamentals of JavaScript programming',
            },
            version: {
              type: 'string',
              enum: ['scorm_1.2', 'scorm_2004'],
              example: 'scorm_1.2',
            },
            fileName: {
              type: 'string',
              example: 'javascript-intro.zip',
            },
            fileSize: {
              type: 'number',
              example: 5242880,
            },
            launchUrl: {
              type: 'string',
              example: 'index.html',
            },
            status: {
              type: 'string',
              enum: ['draft', 'published', 'archived'],
              example: 'published',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ScormAttempt: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            attemptId: {
              type: 'string',
              example: 'ATT-XYZ789',
            },
            learner: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            package: {
              type: 'string',
              example: '507f1f77bcf86cd799439012',
            },
            attemptNumber: {
              type: 'number',
              example: 1,
            },
            status: {
              type: 'string',
              enum: ['not_started', 'in_progress', 'completed', 'passed', 'failed', 'suspended'],
              example: 'completed',
            },
            startedAt: {
              type: 'string',
              format: 'date-time',
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
            },
            score: {
              type: 'number',
              example: 85,
            },
            totalTimeSpent: {
              type: 'number',
              example: 3600,
              description: 'Total time in seconds',
            },
          },
        },
        ScormReportAnalytics: {
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                totalLearners: {
                  type: 'number',
                  example: 50,
                },
                completionRate: {
                  type: 'number',
                  example: 76.5,
                },
                averageScore: {
                  type: 'number',
                  example: 82.3,
                },
                passRate: {
                  type: 'number',
                  example: 88.0,
                },
              },
            },
            scoreDistribution: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  range: {
                    type: 'string',
                    example: '80-90',
                  },
                  count: {
                    type: 'number',
                    example: 15,
                  },
                  percentage: {
                    type: 'number',
                    example: 30.0,
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'No authorization token provided',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'User does not have required permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Access denied. Required role(s): global-admin',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Validation failed',
                errors: [
                  {
                    field: 'email',
                    message: 'email must be a valid email',
                  },
                ],
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Resource not found',
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication and authorization endpoints',
      },
      {
        name: 'Admin',
        description: 'Admin management endpoints',
      },
      {
        name: 'Academic Years',
        description: 'Academic year management',
      },
      {
        name: 'SCORM - Packages',
        description: 'SCORM package management (upload, publish, assign)',
      },
      {
        name: 'SCORM - Content',
        description: 'SCORM content delivery and download',
      },
      {
        name: 'SCORM - Attempts',
        description: 'SCORM attempt tracking and management',
      },
      {
        name: 'SCORM - Runtime',
        description: 'SCORM runtime API (Initialize, GetValue, SetValue, Commit, Terminate)',
      },
      {
        name: 'SCORM - Player',
        description: 'SCORM content player and launcher',
      },
      {
        name: 'SCORM - Reports',
        description: 'SCORM tracking, analytics, and reporting',
      },
      {
        name: 'SCORM - Monitoring',
        description: 'SCORM health checks, metrics, and system monitoring',
      },
      {
        name: 'Health',
        description: 'Health check and monitoring',
      },
    ],
  },
  apis: [
    './routes/**/*.js',
    './routes/**/*.ts',
    './controller/**/*.js',
    './controller/**/*.ts',
    './model/**/*.js',
    './model/**/*.ts',
  ],
};

const specs = swaggerJsdoc(options);

export default specs;
