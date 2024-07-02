import express from "express";

export const handleErrorMiddleware = (
  error: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  return res.status(200).json({
    data: null,
    errors: [
      {
        message: error.message,
        locations: [],
        path: ''
      },
    ],
  });
};
