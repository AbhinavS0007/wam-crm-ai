import { PERMISSIONS } from '../../constants/permissions.js';
import { getRedisClient } from '../../config/redis.js';
import { REALTIME_CHANNEL } from './realtime.events.js';

const clients = new Set();
let subscriberClient = null;

/**
 * Mirrors the Phase 7 read scope: a client receives an event only for its own organization,
 * and only when it can read all conversations or the changed conversation is assigned to it.
 * Unassigned staff never even learn that a lead they can't see changed.
 */
export const shouldDeliverToClient = ({ event, client }) => {
  if (!event || !client) {
    return false;
  }

  if (event.organizationId !== client.organizationId) {
    return false;
  }

  if (client.canReadAll) {
    return true;
  }

  return Boolean(event.assignedTo) && event.assignedTo === client.userId;
};

export const formatSseEvent = (event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

export const registerClient = ({ res, userId, organizationId, permissions = [] }) => {
  const client = {
    res,
    userId: userId?.toString() ?? null,
    organizationId: organizationId?.toString() ?? null,
    canReadAll: permissions.includes(PERMISSIONS.CONVERSATIONS_READ_ALL),
  };

  clients.add(client);
  return client;
};

export const removeClient = (client) => {
  clients.delete(client);
};

export const getClientCount = () => clients.size;

export const deliverEvent = (event) => {
  let delivered = 0;

  for (const client of clients) {
    if (!shouldDeliverToClient({ event, client })) {
      continue;
    }

    try {
      client.res.write(formatSseEvent(event));
      delivered += 1;
    } catch {
      clients.delete(client);
    }
  }

  return delivered;
};

const handleChannelMessage = (message) => {
  try {
    deliverEvent(JSON.parse(message));
  } catch {
    // Ignore malformed messages.
  }
};

export const startRealtimeSubscriber = async ({ redisClient = getRedisClient() } = {}) => {
  if (subscriberClient) {
    return subscriberClient;
  }

  subscriberClient = redisClient.duplicate();
  subscriberClient.on('error', (error) => {
    console.error(`Realtime subscriber error: ${error.message}`);
  });

  await subscriberClient.connect();
  await subscriberClient.subscribe(REALTIME_CHANNEL, handleChannelMessage);

  return subscriberClient;
};

export const stopRealtimeSubscriber = async () => {
  for (const client of clients) {
    try {
      client.res.end();
    } catch {
      // Ignore errors while closing client streams.
    }
  }
  clients.clear();

  if (subscriberClient) {
    try {
      if (subscriberClient.isOpen) {
        await subscriberClient.unsubscribe(REALTIME_CHANNEL);
        await subscriberClient.close();
      }
    } catch {
      // Ignore shutdown errors.
    } finally {
      subscriberClient = null;
    }
  }
};
