import { createInboundMessageIngestionService } from '../ingestion/inbound-message.service.js';
import { createWhatsAppSessionManager } from './session-manager.service.js';

let instance = null;

/**
 * Lazily-created, process-wide session manager. `setSessionManager` lets tests inject a fake
 * so the account API can be exercised without opening real WhatsApp sockets.
 */
export const getSessionManager = () => {
  if (!instance) {
    instance = createWhatsAppSessionManager({
      inboundMessageService: createInboundMessageIngestionService(),
    });
  }

  return instance;
};

export const setSessionManager = (nextManager) => {
  instance = nextManager;
};
