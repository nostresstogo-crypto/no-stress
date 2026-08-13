#!/usr/bin/env node
/**
 * Cross-platform wrapper for `eas update` that injects the correct
 * EXPO_PUBLIC_API_BASE for each channel.
 *
 * Usage:
 *   node scripts/eas-update.js <channel> [message]
 *   pnpm run update:preview "description du fix"
 */

const { execSync } = require("child_process");

const ENV_BY_CHANNEL = {
  preview:    "https://api.no-stress.net/api",
  staging:    "https://api.no-stress.net/api",
  test:       "https://test.api.no-stress.net/api",
  production: "https://api.no-stress.net/api",
};

const channel = process.argv[2];
const message = process.argv.slice(3).join(" ") || "OTA update";

if (!channel || !ENV_BY_CHANNEL[channel]) {
  console.error("Usage: node scripts/eas-update.js <channel> [message]");
  console.error("Channels:", Object.keys(ENV_BY_CHANNEL).join(", "));
  process.exit(1);
}

const apiBase = ENV_BY_CHANNEL[channel];
console.log(`[eas-update] channel=${channel}  API_BASE=${apiBase}`);
console.log(`[eas-update] message="${message}"`);

execSync(
  `npx eas update --channel ${channel} --message "${message.replace(/"/g, '\\"')}"`,
  {
    stdio: "inherit",
    env: { ...process.env, EXPO_PUBLIC_API_BASE: apiBase },
  }
);
