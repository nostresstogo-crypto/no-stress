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
 * Navigates away from a modal screen to a new route.
 *
 * Uses router.dismissTo() — expo-router v6's dedicated API for this exact
 * pattern. It dispatches a single POP_TO action that atomically dismisses
 * the modal stack and navigates to the target, with no setTimeout and no
 * dependency on animation timing systems.
 *
 * Previous approaches that failed on Android production (newArchEnabled):
 * - router.replace() directly → corrupts navigation stack (no dismiss)
 * - router.dismiss() + InteractionManager → fires before native animation
 *   completes because new arch animations bypass InteractionManager
 * - router.dismiss() + setTimeout(500ms) → black screen on production;
 *   replace() after dismiss replaces the root /(tabs) navigator which
 *   Android production Stack navigator doesn't handle correctly
 */
export function dismissAndReplace(href: Href) {
  const target = withUniqueParam(href);
  (router as any).dismissTo(target);
}

/**
 * Navigates away from a modal screen by dismissing it first, then pushing
 * the next route. Uses a platform-appropriate delay after dismiss.
 */
export function dismissAndPush(href: Href) {
  const target = withUniqueParam(href);
  router.dismiss();
  setTimeout(() => router.push(target), Platform.OS === "ios" ? 80 : 500);
}
