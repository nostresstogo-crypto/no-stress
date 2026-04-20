import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
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

// Belt-and-suspenders: explicit error middleware in case Sentry's
// auto-instrumentation isn't fully wired in the esbuild bundle.
// Captures the error to Sentry (if configured) and returns a clean JSON 500
// without leaking stack traces in production.
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  try {
    if (process.env.SENTRY_DSN_API) {
      Sentry.captureException(err);
    }
  } catch {
    // never let error reporting itself crash the request
  }
  logger.error(
    { err: { message: err.message, stack: err.stack }, url: req.url },
    "unhandled error",
  );
  if (res.headersSent) return;
  const isProd = process.env.NODE_ENV === "production";
  res.status(500).json({
    error: "internal_server_error",
    ...(isProd ? {} : { message: err.message }),
  });
});

export default app;
