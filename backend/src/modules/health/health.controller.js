export const getHealth = (req, res) => {
    res.status(200).json({
      data: {
        status: 'ok',
        service: 'wam-backend',
      },
      meta: {
        environment: process.env.NODE_ENV || 'development',
      },
    });
  };