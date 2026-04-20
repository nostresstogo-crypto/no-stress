import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-refresh-token']",
      "res.headers['set-cookie']",
      "*.password",
      "*.passwordHash",
      "*.password_hash",
      "*.currentPassword",
      "*.newPassword",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
      "*.refresh_token",
      "*.access_token",
      "*.jwt",
      "*.secret",
      "*.apiKey",
      "*.api_key",
      "*.verificationCode",
      "*.verification_code",
      "*.code",
      "*.otp",
      "*.authorization",
    ],
    censor: "[REDACTED]",
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
