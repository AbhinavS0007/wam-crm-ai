import { Router } from 'express';

import {
  authenticateRequest,
  requirePasswordChanged,
  requireAccountsManage,
  requireAccountsRead,
} from '../../middleware/auth.middleware.js';

import {
  connectAccount,
  createAccount,
  disconnectAccount,
  getAccount,
  getAccountQr,
  listAccounts,
  pauseAccount,
  removeAccount,
  resetAccount,
  resumeAccount,
} from './whatsapp-account.controller.js';

const whatsappAccountRouter = Router();

whatsappAccountRouter.use(authenticateRequest);
whatsappAccountRouter.use(requirePasswordChanged);

whatsappAccountRouter.get('/', requireAccountsRead, listAccounts);
whatsappAccountRouter.post('/', requireAccountsManage, createAccount);
whatsappAccountRouter.get('/:accountId', requireAccountsRead, getAccount);
whatsappAccountRouter.get('/:accountId/qr', requireAccountsManage, getAccountQr);
whatsappAccountRouter.post('/:accountId/connect', requireAccountsManage, connectAccount);
whatsappAccountRouter.post('/:accountId/pause', requireAccountsManage, pauseAccount);
whatsappAccountRouter.post('/:accountId/resume', requireAccountsManage, resumeAccount);
whatsappAccountRouter.post('/:accountId/reset', requireAccountsManage, resetAccount);
whatsappAccountRouter.post('/:accountId/disconnect', requireAccountsManage, disconnectAccount);
whatsappAccountRouter.delete('/:accountId', requireAccountsManage, removeAccount);

export default whatsappAccountRouter;
