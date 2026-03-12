import { Application } from "express";
import gaslessRouter from "./modules/gasless/routes";
import { handleErrors } from "./middlewares/handleErrors";

export const setupRoutes = (app: Application): void => {
  app.use("/worker/gasless", gaslessRouter);

  app.use(handleErrors);
};
