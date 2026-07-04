import mongoose from 'mongoose';

import { env } from './env.js';

const CONNECTION_STATES = Object.freeze({
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
});

let connectionPromise = null;

export const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose
    .connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    .then(() => mongoose.connection)
    .finally(() => {
      connectionPromise = null;
    });

  return connectionPromise;
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

export const getDatabaseStatus = () => {
  const state = mongoose.connection.readyState;

  return {
    ready: state === 1,
    state: CONNECTION_STATES[state] ?? 'unknown',
  };
};
