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
