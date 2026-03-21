import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import venuesRouter from "./venues";
import citiesRouter from "./cities";
import authRouter from "./auth";
import ticketsRouter from "./tickets";
import subscriptionsRouter from "./subscriptions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(venuesRouter);
router.use(citiesRouter);
router.use(authRouter);
router.use(ticketsRouter);
router.use(subscriptionsRouter);

export default router;
