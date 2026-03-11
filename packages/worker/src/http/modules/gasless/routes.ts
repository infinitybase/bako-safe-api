import { Router } from "express";
import { GaslessController } from "@/http/modules/gasless/controller";

const gaslessRouter = Router();

gaslessRouter.post("/reserve", GaslessController.reserve);

export default gaslessRouter;
