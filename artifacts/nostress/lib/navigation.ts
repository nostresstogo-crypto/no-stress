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
 * Strategy:
 * - Target "/(tabs)": dismiss the modal — (tabs) is already underneath. Done.
 * - Any other target (verify-email, partner-pending, …): push the new screen
 *   ON TOP of the modal in the root stack — no dismiss, no timing dependency.
 *
 *   Stack after push: [(tabs) → auth (modal) → verify-email (card)]
 *   The user sees verify-email full-screen. The screens underneath are hidden.
 *   When verify-email / partner-pending finish, they call dismissAllAndGoHome()
 *   which pops everything back to (tabs) cleanly.
 *
 * Why previous approaches failed on Android production (newArchEnabled):
 * - router.replace() directly inside the modal → black screen (no dismiss)
 * - router.dismiss() + InteractionManager → fires before native animation
 *   completes (new arch animations bypass InteractionManager)
 * - router.dismiss() + setTimeout(500ms) + router.replace() → black screen
 *   because replace() remounts the (tabs) navigator that was already underneath
 * - router.dismissTo(target) → target not in stack, POP finds nothing,
 *   navigation fails silently → blank screen
 */
export function dismissAndReplace(href: Href) {
  const hrefStr = typeof href === "string" ? href : (href as any).pathname;

  if (hrefStr === "/(tabs)") {
    // Login success is now handled by a useEffect in auth.tsx that watches
    // the user state and dismisses only after React has committed the update.
    // This call is kept as a fallback for any other caller.
    router.dismiss();
    return;
  }

  // For all other screens: push on top of the open modal.
  // No dismiss call = no animation timing race condition.
  router.push(withUniqueParam(href));
}

/**
 * Pop all screens back to the root (tabs) screen.
 * Use this from verify-email / partner-pending when the flow is complete,
 * so the auth modal left underneath is also removed from the stack.
 *
 * Stack before: [(tabs) → auth (modal) → verify-email (card)]
 * Stack after:  [(tabs)]
 */
export function dismissAllAndGoHome() {
  (router as any).dismissAll?.();
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
