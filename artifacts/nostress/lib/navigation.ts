import { InteractionManager, Platform } from "react-native";
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
 * On iOS, router.dismiss() triggers a slide-down animation (~80ms).
 * On Android, the modal dismiss animation can take 200-350ms depending on
 * the device — calling router.replace() too early (while the animation is
 * still playing) corrupts the navigation stack and crashes/restarts the app.
 *
 * Using InteractionManager.runAfterInteractions() defers the replacement until
 * React Native signals that all in-flight animations are done, making this
 * safe on every device regardless of animation speed.
 */
export function dismissAndReplace(href: Href) {
  const target = withUniqueParam(href);
  router.dismiss();
  // One rAF tick lets React Navigation register the dismiss animation,
  // then runAfterInteractions waits for it to fully complete before replacing.
  requestAnimationFrame(() => {
    InteractionManager.runAfterInteractions(() => {
      router.replace(target);
    });
  });
}

export function dismissAndPush(href: Href) {
  const target = withUniqueParam(href);
  router.dismiss();
  requestAnimationFrame(() => {
    InteractionManager.runAfterInteractions(() => {
      router.push(target);
    });
  });
}
