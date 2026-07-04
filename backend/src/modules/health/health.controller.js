import { getLivenessSnapshot, getReadinessSnapshot } from './health.service.js';

export const getHealth = (req, res) => {
  res.status(200).json(getLivenessSnapshot());
};

export const getReadiness = (req, res) => {
  const snapshot = getReadinessSnapshot();

  res.status(snapshot.ready ? 200 : 503).json(snapshot.body);
};
