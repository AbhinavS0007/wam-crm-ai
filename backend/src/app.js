import express from 'express';

import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';
import { requestContextMiddleware } from './middleware/request-context.middleware.js';
import authRouter from './modules/auth/auth.routes.js';
import healthRouter from './modules/health/health.routes.js';
import userRouter from './modules/users/user.routes.js';

const app = express();

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', env.FRONTEND_ORIGIN);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(requestContextMiddleware);

app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
