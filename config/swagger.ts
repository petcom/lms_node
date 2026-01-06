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
        // DCV-001: User schema with roles array
        User: {
          type: 'object',
          description: 'User account for authentication. Shares _id with Admin/Staff/Learner (DCV-001).',
          properties: {
            _id: {
              type: 'string',
              description: 'Shared with Admin/Staff/Learner _id',
              example: '507f1f77bcf86cd799439011',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            username: {
              type: 'string',
              example: 'johndoe',
            },
            roles: {
              type: 'array',
              description: 'User roles (DCV-001: replaces legacy role field)',
              items: {
                type: 'string',
                enum: ['global-admin', 'staff', 'learner'],
              },
              example: ['staff'],
            },
            primaryRole: {
              type: 'string',
              description: 'Default dashboard role (auto-set from roles[0] if not provided)',
              enum: ['global-admin', 'staff', 'learner'],
              example: 'staff',
            },
            staffRoles: {
              type: 'array',
              description: 'Staff permission roles (DCV-001: renamed from subroles)',
              items: {
                type: 'string',
              },
              example: ['instructor', 'department-admin'],
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'archived', 'deleted'],
              example: 'active',
            },
            emailVerified: {
              type: 'boolean',
              example: true,
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
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
        // DCV-039: Admin derives email from User
        Admin: {
          type: 'object',
          description: 'Global administrator. Shares _id with User (DCV-039: email derived from User).',
          properties: {
            _id: {
              type: 'string',
              description: 'Shared with User._id',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'John Doe',
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
        // DCV-021, DCV-022, DCV-025: Staff schema updates
        Staff: {
          type: 'object',
          description: 'Staff member (instructor, admin, etc.). Shares _id with User.',
          properties: {
            _id: {
              type: 'string',
              description: 'Shared with User._id',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'object',
              properties: {
                first: { type: 'string', example: 'Jane' },
                middle: { type: 'string', example: 'M' },
                last: { type: 'string', example: 'Smith' },
                display: { type: 'string', example: 'Smith, Jane M.' },
              },
            },
            staffId: {
              type: 'string',
              example: 'STF001',
            },
            departmentMemberships: {
              type: 'array',
              description: 'DCV-022: Departments and roles (replaces single department field)',
              items: {
                type: 'object',
                properties: {
                  department: { type: 'string', example: '507f1f77bcf86cd799439011' },
                  role: { type: 'string', example: 'instructor' },
                  isPrimary: { type: 'boolean', example: true },
                },
              },
            },
            status: {
              type: 'string',
              description: 'DCV-040: Status enum replaces isWithdrawn/isSuspended',
              enum: ['active', 'suspended', 'withdrawn'],
              example: 'active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // DCV-041, DCV-029: Learner schema updates
        Learner: {
          type: 'object',
          description: 'Learner/student. Shares _id with User.',
          properties: {
            _id: {
              type: 'string',
              description: 'Shared with User._id',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'object',
              properties: {
                first: { type: 'string', example: 'John' },
                middle: { type: 'string', example: 'A' },
                last: { type: 'string', example: 'Doe' },
                display: { type: 'string', example: 'Doe, John A.' },
              },
            },
            learnerId: {
              type: 'string',
              example: 'LRN123',
            },
            dateAdmitted: {
              type: 'string',
              format: 'date-time',
            },
            globalStatus: {
              type: 'string',
              enum: ['active', 'inactive'],
              example: 'active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // DCV-026: ProgramEnrollment with credential goals
        ProgramEnrollment: {
          type: 'object',
          description: 'DCV-026: Learner program enrollment with credential tracking',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            learner: {
              type: 'string',
              description: 'Reference to Learner',
              example: '507f1f77bcf86cd799439011',
            },
            program: {
              type: 'string',
              description: 'Reference to Program',
              example: '507f1f77bcf86cd799439011',
            },
            credentialGoal: {
              type: 'string',
              enum: ['certificate', 'degree', 'none'],
              example: 'certificate',
            },
            targetCredential: {
              type: 'string',
              description: 'Reference to Credential being pursued',
            },
            status: {
              type: 'string',
              enum: ['applied', 'enrolled', 'on-leave', 'withdrawn', 'completed'],
              example: 'enrolled',
            },
            statusHistory: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  reason: { type: 'string' },
                  changedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            enrolledAt: {
              type: 'string',
              format: 'date-time',
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // DCV-027: CourseEnrollmentCurrent
        CourseEnrollmentCurrent: {
          type: 'object',
          description: 'DCV-027: Active course enrollment (deleted when course ends)',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            learner: {
              type: 'string',
              description: 'Reference to Learner',
            },
            course: {
              type: 'string',
              description: 'Reference to Course',
            },
            programEnrollment: {
              type: 'string',
              description: 'Reference to ProgramEnrollment',
            },
            enrolledAt: {
              type: 'string',
              format: 'date-time',
            },
            progress: {
              type: 'object',
              properties: {
                examAttempts: { type: 'array', items: { type: 'object' } },
                mediaProgress: { type: 'array', items: { type: 'object' } },
                scormAttempts: { type: 'array', items: { type: 'object' } },
              },
            },
            lastActivityAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // DCV-028: CourseEnrollmentActivity
        CourseEnrollmentActivity: {
          type: 'object',
          description: 'DCV-028: Completed/withdrawn course history (permanent record)',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            learner: {
              type: 'string',
              description: 'Reference to Learner',
            },
            course: {
              type: 'string',
              description: 'Reference to Course',
            },
            programEnrollment: {
              type: 'string',
              description: 'Reference to ProgramEnrollment',
            },
            outcome: {
              type: 'string',
              enum: ['passed', 'failed', 'withdrawn'],
              example: 'passed',
            },
            finalScoring: {
              type: 'object',
              properties: {
                totalPoints: { type: 'number' },
                maxPoints: { type: 'number' },
                percentage: { type: 'number' },
              },
            },
            creditsEarned: {
              type: 'number',
              example: 3,
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // DCV-031: Credential model
        Credential: {
          type: 'object',
          description: 'DCV-031: Certificate, degree, or diploma',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'Certificate in Web Development',
            },
            type: {
              type: 'string',
              enum: ['certificate', 'degree', 'diploma'],
              example: 'certificate',
            },
            program: {
              type: 'string',
              description: 'Reference to Program',
            },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'archived'],
              example: 'active',
            },
            totalCreditsRequired: {
              type: 'number',
              example: 30,
            },
          },
        },
        // DCV-051: Media model
        Media: {
          type: 'object',
          description: 'DCV-051: External hosted content (videos, documents)',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'Introduction Video',
            },
            type: {
              type: 'string',
              enum: ['video', 'audio', 'document', 'image', 'embed'],
              example: 'video',
            },
            url: {
              type: 'string',
              format: 'uri',
              example: 'https://youtube.com/watch?v=...',
            },
            provider: {
              type: 'string',
              example: 'youtube',
            },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'archived'],
              example: 'active',
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
