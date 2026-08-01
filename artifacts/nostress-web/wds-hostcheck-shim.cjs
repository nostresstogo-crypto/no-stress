/**
 * wds-hostcheck-shim.cjs
 *
 * Patches webpack-dev-server's setupHostHeaderCheck() to be a no-op.
 *
 * WHY: Node v24 ships path-to-regexp v8+ which removed the pathRegexp()
 * export that Express v4 relies on. When WDS calls
 * `this.app.all("*", handler)` inside setupHostHeaderCheck(), Express
 * tries to compile the "*" route pattern via the new path-to-regexp API
 * which hangs silently, blocking the entire server startup.
 *
 * With DANGEROUSLY_DISABLE_HOST_CHECK=true, CRA sets allowedHosts:"all",
 * so skipping the middleware registration is safe in this dev environment.
 *
 * Timing: this file is loaded via --require BEFORE react-scripts runs,
 * so the patched prototype is in place when WDS is instantiated.
 */
"use strict";

try {
  // Resolve WDS from this package's node_modules (via pnpm hoisting)
  const wdsPath = require.resolve("webpack-dev-server");
  const WDS = require(wdsPath);
  if (
    WDS &&
    WDS.prototype &&
    typeof WDS.prototype.setupHostHeaderCheck === "function"
  ) {
    WDS.prototype.setupHostHeaderCheck = function () {
      // no-op: host checking disabled via allowedHosts:"all"
    };
  }
} catch (_) {
  // Silently ignore if WDS is not found in this context;
  // it will be patched again when react-scripts loads it.
}

// Belt-and-suspenders: also intercept via Module._load for any
// webpack-dev-server require that goes through a different resolution path.
const Module = require("module");
const origLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  const result = origLoad.call(this, request, parent, isMain);
  if (
    result &&
    typeof result === "function" &&
    result.prototype &&
    typeof result.prototype.setupHostHeaderCheck === "function" &&
    !result.prototype.__wdsHostCheckPatched
  ) {
    result.prototype.setupHostHeaderCheck = function () {};
    result.prototype.__wdsHostCheckPatched = true;
  }
  return result;
};
