/**
 * Swagger API Documentation Configuration
 * Provides OpenAPI/Swagger specification for the LMS API
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'School Management System (LMS) API',
      version: '1.0.0',
      description: 'RESTful API for School Learning Management System',
      contact: {
        name: 'API Support',
        email: 'support@lms.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:8082',
        description: 'Development server'
      },
      {
        url: 'http://localhost:8082',
        description: 'Local server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login endpoint'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error'
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object'
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success'
            },
            message: {
              type: 'string',
              example: 'Success message'
            },
            data: {
              type: 'object'
            }
          }
        },
        Admin: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              example: 'John Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@example.com'
            },
            role: {
              type: 'string',
              example: 'admin'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        AcademicYear: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              example: '2024-2025',
              pattern: '^\\d{4}-\\d{4}$'
            },
            fromYear: {
              type: 'string',
              format: 'date'
            },
            toYear: {
              type: 'string',
              format: 'date'
            },
            isCurrent: {
              type: 'boolean',
              example: false
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                status: 'error',
                message: 'No authorization token provided'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'User does not have required permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                status: 'error',
                message: 'Access denied. Required role(s): admin'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                status: 'error',
                message: 'Validation failed',
                errors: [
                  {
                    field: 'email',
                    message: 'email must be a valid email'
                  }
                ]
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                status: 'error',
                message: 'Resource not found'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication and authorization endpoints'
      },
      {
        name: 'Admin',
        description: 'Admin management endpoints'
      },
      {
        name: 'Academic Years',
        description: 'Academic year management'
      },
      {
        name: 'Health',
        description: 'Health check and monitoring'
      }
    ]
  },
  apis: [
    './routes/**/*.js',
    './controller/**/*.js',
    './model/**/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
