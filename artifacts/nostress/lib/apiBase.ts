import Constants from "expo-constants";

type ExtraConfig = {
  apiBase?: string;
  webBase?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveBase(
  explicitEnvKey: "EXPO_PUBLIC_API_BASE" | "EXPO_PUBLIC_WEB_BASE",
  extraKey: keyof ExtraConfig,
  replitSuffix: string,
): string {
  const explicit = process.env[explicitEnvKey];
  if (explicit) return stripTrailingSlash(explicit);
  const fromExtra = extra[extraKey];
  if (fromExtra) return stripTrailingSlash(fromExtra);
  const replitDomain = process.env.EXPO_PUBLIC_DOMAIN;
  if (replitDomain) return `https://${replitDomain}${replitSuffix}`;
  return `http://localhost:8080${replitSuffix}`;
}

export const API_BASE = resolveBase("EXPO_PUBLIC_API_BASE", "apiBase", "/api");
export const WEB_BASE = resolveBase("EXPO_PUBLIC_WEB_BASE", "webBase", "/nostress-web");
