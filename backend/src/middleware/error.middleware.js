import { env } from '../config/env.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found.`,
    },
  });
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const statusCode = error.statusCode ?? 500;

  res.status(statusCode).json({
    error: {
      code: error.code ?? 'INTERNAL_SERVER_ERROR',
      message:
        statusCode >= 500 && env.NODE_ENV === 'production'
          ? 'Internal server error.'
          : error.message,
      details: error.details ?? null,
      requestId: req.context?.requestId ?? null,
    },
  });
};
