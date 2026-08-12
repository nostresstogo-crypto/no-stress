import { Platform } from "react-native";
import { router } from "expo-router";

type Href = string | { pathname: string; params?: Record<string, any> };

let counter = 0;

function withUniqueParam(href: Href): any {
  counter += 1;
  const stamp = `${Date.now().toString(36)}${counter}`;
  if (typeof href === "string") {
    const sep = href.includes("?") ? "&" : "?";
    return `${href}${sep}_n=${stamp}`;
  }
  return { pathname: href.pathname, params: { ...(href.params || {}), _n: stamp } };
}

export function safePush(href: Href) {
  router.push(withUniqueParam(href));
}

export function safeReplace(href: Href) {
  router.replace(withUniqueParam(href));
}

/**
 * Navigates away from a modal screen by dismissing it first, then navigating
 * once the dismiss animation has fully completed.
 *
 * WHY a fixed timeout rather than InteractionManager:
 * With newArchEnabled (Fabric/JSI), native-driven dismiss animations are not
 * registered with the InteractionManager, so runAfterInteractions() fires
 * immediately — before the animation completes — causing the same navigation
 * stack corruption as calling replace() with no delay at all.
 *
 * A 500 ms delay on Android is well above the longest modal dismiss animation
 * (~300 ms on the slowest devices) and is unconditionally reliable across
 * both old and new architecture production builds.
 */
const DISMISS_DELAY_MS = Platform.OS === "ios" ? 80 : 500;

export function dismissAndReplace(href: Href) {
  const target = withUniqueParam(href);
  router.dismiss();
  setTimeout(() => router.replace(target), DISMISS_DELAY_MS);
}

export function dismissAndPush(href: Href) {
  const target = withUniqueParam(href);
  router.dismiss();
  setTimeout(() => router.push(target), DISMISS_DELAY_MS);
}
