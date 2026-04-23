import { Platform } from "react-native";
import { router } from "expo-router";

let counter = 0;

function withUniqueParam(href: string): string {
  counter += 1;
  const stamp = `${Date.now().toString(36)}${counter}`;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}_n=${stamp}`;
}

export function safePush(href: string) {
  router.push(withUniqueParam(href) as any);
}

export function safeReplace(href: string) {
  router.replace(withUniqueParam(href) as any);
}

/**
 * Use when navigating away from a modal screen on iOS.
 * Dismisses the current modal first, then pushes the next route.
 * Without this, iOS keeps the modal on top and the new screen never appears.
 */
export function dismissAndPush(href: string) {
  const target = withUniqueParam(href);
  if (Platform.OS === "ios") {
    try {
      (router as any).dismiss?.();
    } catch {}
    setTimeout(() => router.push(target as any), 80);
  } else {
    router.push(target as any);
  }
}

export function dismissAndReplace(href: string) {
  const target = withUniqueParam(href);
  if (Platform.OS === "ios") {
    try {
      (router as any).dismiss?.();
    } catch {}
    setTimeout(() => router.replace(target as any), 80);
  } else {
    router.replace(target as any);
  }
}
