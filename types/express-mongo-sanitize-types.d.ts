// TypeScript type definitions for express-mongo-sanitize
// This package doesn't have official type definitions

declare module 'express-mongo-sanitize' {
  import { Request, RequestHandler } from 'express';

  interface MongoSanitizeOptions {
    replaceWith?: string;
    onSanitize?: (options: { req: Request; key: string }) => void;
  }

  function mongoSanitize(options?: MongoSanitizeOptions): RequestHandler;

  export = mongoSanitize;
}
