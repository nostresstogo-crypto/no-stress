import type { ExpoConfig, ConfigContext } from "expo/config";

function buildExtra() {
  const apiBase = process.env.EXPO_PUBLIC_API_BASE?.trim();
  const webBase = process.env.EXPO_PUBLIC_WEB_BASE?.trim();
  return {
    ...(apiBase ? { apiBase } : {}),
    ...(webBase ? { webBase } : {}),
  };
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  extra: {
    ...(config.extra ?? {}),
    ...buildExtra(),
  },
});
