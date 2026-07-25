import { Router } from 'express';

import {
  authenticateRequest,
  requireClientPiiReveal,
  requireConversationsRead,
} from '../../middleware/auth.middleware.js';

import { getContact, revealContactPhone } from './contact.controller.js';

const contactRouter = Router();

contactRouter.use(authenticateRequest);

contactRouter.get('/:contactId', requireConversationsRead, getContact);
contactRouter.post('/:contactId/reveal-phone', requireClientPiiReveal, revealContactPhone);

export default contactRouter;
