const Module = require("module");
const path = require("path");

const TW_V3_PATH = require.resolve("tailwindcss", {
  paths: [path.join(__dirname, "node_modules")],
});
const TW_V3_DIR = path.dirname(TW_V3_PATH);

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === "tailwindcss") {
    return TW_V3_PATH;
  }
  if (typeof request === "string" && request.startsWith("tailwindcss/")) {
    const sub = request.slice("tailwindcss/".length);
    try {
      return require.resolve(path.join(TW_V3_DIR, "..", sub));
    } catch (_) {}
  }
  return origResolve.call(this, request, parent, ...rest);
};
