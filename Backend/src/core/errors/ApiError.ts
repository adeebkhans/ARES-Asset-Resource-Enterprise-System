import { ErrorCode, ErrorCodeType } from '@/constants/errors';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCodeType;
  public readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCodeType, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, ErrorCode.VALIDATION_ERROR, message, details);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, ErrorCode.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, ErrorCode.FORBIDDEN, message);
  }

  static notFound(message = 'Not found'): ApiError {
    return new ApiError(404, ErrorCode.NOT_FOUND, message);
  }

  static conflict(message: string, details?: unknown): ApiError {
    return new ApiError(409, ErrorCode.CONFLICT, message, details);
  }

  static invalidStateTransition(message: string, details?: unknown): ApiError {
    return new ApiError(409, ErrorCode.INVALID_STATE_TRANSITION, message, details);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, ErrorCode.INTERNAL_ERROR, message);
  }
}
