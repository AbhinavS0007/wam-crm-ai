import { Router } from 'express';

import { authenticateRequest } from '../../middleware/auth.middleware.js';

import { login, logout, logoutAll, me, refresh } from './auth.controller.js';

const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.post('/logout-all', authenticateRequest, logoutAll);
authRouter.get('/me', authenticateRequest, me);

export default authRouter;
