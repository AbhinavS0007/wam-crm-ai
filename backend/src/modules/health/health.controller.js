import { env } from '../../config/env.js';

export const getHealth = (req, res) => {
  res.status(200).json({
    data: {
      status: 'ok',
      service: 'wam-backend',
    },
    meta: {
      environment: env.NODE_ENV,
    },
  });
};
