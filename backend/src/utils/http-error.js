export class HttpError extends Error {
  constructor({
    statusCode = 500,
    message = 'Internal server error',
    code = 'INTERNAL_SERVER_ERROR',
    details = null,
  } = {}) {
    super(message);

    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const createHttpError = ({ statusCode, message, code, details }) =>
  new HttpError({
    statusCode,
    message,
    code,
    details,
  });
