import { Router } from "express";
import { GaslessController } from "@/http/modules/gasless/controller";

const gaslessRouter = Router();

gaslessRouter.post("/reserve", GaslessController.reserve);
gaslessRouter.get("/pool/stats", GaslessController.stats);

export default gaslessRouter;
