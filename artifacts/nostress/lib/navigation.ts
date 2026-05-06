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
 * Use when navigating away from a modal screen on iOS.
 * Dismisses the current modal first, then pushes the next route.
 * Without this, iOS keeps the modal on top and the new screen never appears.
 */
export function dismissAndPush(href: Href) {
  const target = withUniqueParam(href);
  if (Platform.OS === "ios") {
    try {
      (router as any).dismiss?.();
    } catch {}
    setTimeout(() => router.push(target), 80);
  } else {
    router.push(target);
  }
}

export function dismissAndReplace(href: Href) {
  const target = withUniqueParam(href);
  if (Platform.OS === "ios") {
    try {
      (router as any).dismiss?.();
    } catch {}
    setTimeout(() => router.replace(target), 80);
  } else {
    router.replace(target);
  }
}
