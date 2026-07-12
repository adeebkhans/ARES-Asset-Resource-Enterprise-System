import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '@/core/errors/ApiError';
import { ErrorCode } from '@/constants/errors';

type RequestPart = 'body' | 'query' | 'params';

/** Parses and replaces `req[part]` with the Zod-validated (and coerced/defaulted) value. */
export function validate(schema: AnyZodObject, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req[part] = schema.parse(req[part]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Validation failed', err.flatten()));
        return;
      }
      next(err);
    }
  };
}
