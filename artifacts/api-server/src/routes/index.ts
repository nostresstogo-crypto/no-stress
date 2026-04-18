import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import venuesRouter from "./venues";
import citiesRouter from "./cities";
import authRouter from "./auth";
import ticketsRouter from "./tickets";
import subscriptionsRouter from "./subscriptions";
import adminRouter from "./admin";
import partnersRouter from "./partners";
import deletionRequestsRouter from "./deletionRequests";
import contactRouter from "./contact";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(venuesRouter);
router.use(citiesRouter);
router.use(authRouter);
router.use(ticketsRouter);
router.use(subscriptionsRouter);
router.use(adminRouter);
router.use(partnersRouter);
router.use(deletionRequestsRouter);
router.use(contactRouter);

export default router;
