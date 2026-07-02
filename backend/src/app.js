import express from 'express';
import healthRouter from './modules/health/health.routes.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

const app = express();

app.use(express.json());

app.use('/api/v1/health', healthRouter);

app.use(notFound);
app.use(errorHandler);

export default app;