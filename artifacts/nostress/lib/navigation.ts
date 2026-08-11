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
 * Navigates away from a modal screen by dismissing it first, then pushing
 * the next route. Required on both iOS and Android: calling push/replace
 * from inside a modal without dismissing first causes the modal to remain
 * on top (iOS) or crashes/restarts the app (Android).
 */
export function dismissAndPush(href: Href) {
  const target = withUniqueParam(href);
  try {
    (router as any).dismiss?.();
  } catch {}
  // iOS needs a slightly longer delay for the dismiss animation to complete.
  setTimeout(() => router.push(target), Platform.OS === "ios" ? 80 : 50);
}

export function dismissAndReplace(href: Href) {
  const target = withUniqueParam(href);
  try {
    (router as any).dismiss?.();
  } catch {}
  // iOS needs a slightly longer delay for the dismiss animation to complete.
  setTimeout(() => router.replace(target), Platform.OS === "ios" ? 80 : 50);
}
