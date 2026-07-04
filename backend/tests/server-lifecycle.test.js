import { EventEmitter } from 'node:events';

import { describe, expect, it, vi } from 'vitest';

import { startServer, stopServer } from '../src/server-lifecycle.js';

const createFakeHttpServer = () => {
  const server = new EventEmitter();

  server.listening = true;

  server.close = vi.fn((callback) => {
    server.listening = false;
    callback();
  });

  return server;
};

const createFakeApp = (server) => ({
  listen: vi.fn((port, callback) => {
    queueMicrotask(callback);

    return server;
  }),
});

describe('server lifecycle', () => {
  it('connects MongoDB and Redis before accepting requests', async () => {
    const callOrder = [];
    const server = createFakeHttpServer();
    const appInstance = createFakeApp(server);

    const connectDatabaseFn = vi.fn(async () => {
      callOrder.push('mongodb');
    });

    const connectRedisFn = vi.fn(async () => {
      callOrder.push('redis');
    });

    const result = await startServer({
      appInstance,
      port: 5001,
      connectDatabaseFn,
      connectRedisFn,
      disconnectDatabaseFn: vi.fn(),
      disconnectRedisFn: vi.fn(),
    });

    expect(result).toBe(server);
    expect(callOrder).toEqual(['mongodb', 'redis']);
    expect(appInstance.listen).toHaveBeenCalledWith(5001, expect.any(Function));
  });

  it('does not start HTTP when MongoDB connection fails', async () => {
    const databaseError = new Error('MongoDB unavailable');
    const server = createFakeHttpServer();
    const appInstance = createFakeApp(server);

    const connectDatabaseFn = vi.fn().mockRejectedValue(databaseError);

    const connectRedisFn = vi.fn();
    const disconnectDatabaseFn = vi.fn();
    const disconnectRedisFn = vi.fn();

    await expect(
      startServer({
        appInstance,
        port: 5001,
        connectDatabaseFn,
        connectRedisFn,
        disconnectDatabaseFn,
        disconnectRedisFn,
      }),
    ).rejects.toThrow('MongoDB unavailable');

    expect(connectRedisFn).not.toHaveBeenCalled();
    expect(appInstance.listen).not.toHaveBeenCalled();
    expect(disconnectDatabaseFn).toHaveBeenCalledOnce();
    expect(disconnectRedisFn).toHaveBeenCalledOnce();
  });

  it('cleans up MongoDB when Redis connection fails', async () => {
    const redisError = new Error('Redis unavailable');
    const server = createFakeHttpServer();
    const appInstance = createFakeApp(server);

    const connectDatabaseFn = vi.fn().mockResolvedValue(undefined);

    const connectRedisFn = vi.fn().mockRejectedValue(redisError);

    const disconnectDatabaseFn = vi.fn();
    const disconnectRedisFn = vi.fn();

    await expect(
      startServer({
        appInstance,
        port: 5001,
        connectDatabaseFn,
        connectRedisFn,
        disconnectDatabaseFn,
        disconnectRedisFn,
      }),
    ).rejects.toThrow('Redis unavailable');

    expect(appInstance.listen).not.toHaveBeenCalled();
    expect(disconnectDatabaseFn).toHaveBeenCalledOnce();
    expect(disconnectRedisFn).toHaveBeenCalledOnce();
  });

  it('closes HTTP, Redis and MongoDB during shutdown', async () => {
    const server = createFakeHttpServer();
    const disconnectDatabaseFn = vi.fn();
    const disconnectRedisFn = vi.fn();

    await stopServer({
      server,
      disconnectDatabaseFn,
      disconnectRedisFn,
    });

    expect(server.close).toHaveBeenCalledOnce();
    expect(server.listening).toBe(false);
    expect(disconnectRedisFn).toHaveBeenCalledOnce();
    expect(disconnectDatabaseFn).toHaveBeenCalledOnce();
  });

  it('allows shutdown before an HTTP server has started', async () => {
    const disconnectDatabaseFn = vi.fn();
    const disconnectRedisFn = vi.fn();

    await expect(
      stopServer({
        server: undefined,
        disconnectDatabaseFn,
        disconnectRedisFn,
      }),
    ).resolves.toBeUndefined();

    expect(disconnectRedisFn).toHaveBeenCalledOnce();
    expect(disconnectDatabaseFn).toHaveBeenCalledOnce();
  });
});
