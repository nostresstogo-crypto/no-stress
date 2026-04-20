import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import * as Sentry from "@sentry/node";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: process.env.NODE_ENV === "production"
      ? { maxAge: 15552000, includeSubDomains: true }
      : false,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (process.env.SENTRY_DSN_API) {
  Sentry.setupExpressErrorHandler(app);
}

export default app;
