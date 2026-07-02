export const notFound = (req, res) => {
    res.status(404).json({
      error: {
        message: 'Route not found',
      },
    });
  };
  
  export const errorHandler = (err, req, res, next) => {
    console.error(err);
  
    res.status(500).json({
      error: {
        message: 'Internal server error',
      },
    });
  };