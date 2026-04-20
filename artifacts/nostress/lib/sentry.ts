import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

let initialized = false;

export function initSentry(): void {
  if (initialized || !dsn) return;
  try {
    Sentry.init({
      dsn,
      environment: __DEV__ ? "development" : "production",
      enabled: !__DEV__,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
    initialized = true;
  } catch (e) {
    console.error("[Sentry] init failed:", e);
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {}
}

export { Sentry };
