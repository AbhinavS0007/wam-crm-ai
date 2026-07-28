import { Router } from 'express';

import {
  authenticateRequest,
  requireConversationsAssign,
  requireConversationsRead,
  requireMessagesSend,
  requirePasswordChanged,
} from '../../middleware/auth.middleware.js';
import { conversationFollowUpRouter } from '../followups/followup.routes.js';
import noteRouter from '../notes/note.routes.js';
import { conversationTagRouter } from '../tags/tag.routes.js';

import {
  assignConversation,
  changeConversationStage,
  getConversation,
  getConversationActivity,
  getConversationMessages,
  listConversations,
  sendConversationMessage,
} from './conversation.controller.js';

const conversationRouter = Router();

conversationRouter.use(authenticateRequest);
conversationRouter.use(requirePasswordChanged);

conversationRouter.get('/', requireConversationsRead, listConversations);
conversationRouter.get('/:conversationId', requireConversationsRead, getConversation);
conversationRouter.get(
  '/:conversationId/messages',
  requireConversationsRead,
  getConversationMessages,
);
conversationRouter.get(
  '/:conversationId/activity',
  requireConversationsRead,
  getConversationActivity,
);
conversationRouter.patch(
  '/:conversationId/assignment',
  requireConversationsAssign,
  assignConversation,
);
conversationRouter.patch(
  '/:conversationId/stage',
  requireConversationsRead,
  changeConversationStage,
);
conversationRouter.post('/:conversationId/messages', requireMessagesSend, sendConversationMessage);

// Conversation-scoped CRM sub-resources
conversationRouter.use('/:conversationId/notes', noteRouter);
conversationRouter.use('/:conversationId/follow-ups', conversationFollowUpRouter);
conversationRouter.use('/:conversationId/tags', conversationTagRouter);

export default conversationRouter;
