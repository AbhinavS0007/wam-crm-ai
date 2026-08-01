import express from 'express';

import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';
import { requestContextMiddleware } from './middleware/request-context.middleware.js';
import aiKnowledgeRouter from './modules/ai-knowledge/ai-knowledge.routes.js';
import authRouter from './modules/auth/auth.routes.js';
import contactRouter from './modules/contacts/contact.routes.js';
import conversationRouter from './modules/conversations/conversation.routes.js';
import followUpRouter from './modules/followups/followup.routes.js';
import healthRouter from './modules/health/health.routes.js';
import realtimeRouter from './modules/realtime/realtime.routes.js';
import stageRouter from './modules/stages/stage.routes.js';
import tagRouter from './modules/tags/tag.routes.js';
import userRouter from './modules/users/user.routes.js';
import whatsappAccountRouter from './modules/whatsapp-accounts/whatsapp-account.routes.js';

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
app.use('/api/v1/conversations', conversationRouter);
app.use('/api/v1/contacts', contactRouter);
app.use('/api/v1/tags', tagRouter);
app.use('/api/v1/stages', stageRouter);
app.use('/api/v1/ai/knowledge', aiKnowledgeRouter);
app.use('/api/v1/follow-ups', followUpRouter);
app.use('/api/v1/whatsapp-accounts', whatsappAccountRouter);
app.use('/api/v1/realtime', realtimeRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
