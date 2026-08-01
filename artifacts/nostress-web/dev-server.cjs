/**
 * dev-server.cjs — wrapper react-scripts start pour Node v24
 *
 * PROBLÈME : path-to-regexp v8 + Express v4 (WDS v4) — app.all("*") hang.
 *
 * SOLUTION : patcher setupHostHeaderCheck() → no-op via Module._load.
 * Avec DANGEROUSLY_DISABLE_HOST_CHECK=true, allowedHosts:"all" est déjà
 * configuré et ce check est inutile.
 *
 * IMPORTANT : pnpm isole les instances de modules. Module._load intercepte
 * TOUTES les instances WDS et patch la première qui est chargée. Le flag
 * __wdsPatched est mis sur le PROTOTYPE (par-instance) et non sur une
 * variable globale, pour survivre à l'isolation pnpm.
 */
"use strict";

const path = require("path");
const Module = require("module");

// ── 1. Shim tailwind ──────────────────────────────────────────────────────
require("./tailwind-resolve-shim.cjs");

// ── 2. Patch WDS.setupHostHeaderCheck → no-op ────────────────────────────
function patchWDSIfNeeded(WDS) {
  if (
    !WDS ||
    typeof WDS !== "function" ||
    !WDS.prototype ||
    typeof WDS.prototype.setupHostHeaderCheck !== "function" ||
    WDS.prototype.__wdsPatched
  ) {
    return false;
  }
  WDS.prototype.setupHostHeaderCheck = function () {};
  WDS.prototype.__wdsPatched = true;
  return true;
}

// Intercepter TOUTES les instances WDS (pnpm peut en créer plusieurs)
const _origLoad = Module._load;
Module._load = function (req, parent, isMain) {
  const result = _origLoad.call(this, req, parent, isMain);
  patchWDSIfNeeded(result);
  return result;
};

// Tentative directe (résolution depuis ce fichier)
try {
  patchWDSIfNeeded(require("webpack-dev-server"));
} catch (_) {}

// ── 3. Lancer react-scripts/start ─────────────────────────────────────────
const reactScriptsBin = require.resolve("react-scripts/bin/react-scripts");
const reactScriptsDir = path.dirname(path.dirname(reactScriptsBin));
const startScript = path.join(reactScriptsDir, "scripts", "start.js");
process.argv[2] = "start";
require(startScript);
