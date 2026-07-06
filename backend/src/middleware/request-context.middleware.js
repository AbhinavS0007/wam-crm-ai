import { randomUUID } from 'node:crypto';

export const requestContextMiddleware = (req, res, next) => {
  const requestId = req.get('x-request-id') || randomUUID();

  req.context = {
    requestId,
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
  };

  res.setHeader('x-request-id', requestId);

  next();
};
