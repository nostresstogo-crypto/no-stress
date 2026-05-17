const path = require("path");

// In a pnpm monorepo, @expo/config-plugins is not directly resolvable
// from the plugin file. We resolve it through the `expo` package which
// always depends on it, walking up the directory tree as a fallback.
function requireConfigPlugins() {
  const searchRoots = [
    path.join(__dirname, ".."),
    path.join(__dirname, "..", ".."),
    path.join(__dirname, "..", "..", ".."),
  ];

  for (const root of searchRoots) {
    try {
      const expoDir = path.dirname(
        require.resolve("expo/package.json", { paths: [root] })
      );
      return require(
        require.resolve("@expo/config-plugins", {
          paths: [expoDir, path.join(expoDir, "node_modules"), root],
        })
      );
    } catch (_) {}
  }

  // Last resort: standard require (works when hoisted or globally available)
  return require("@expo/config-plugins");
}

const { withAndroidManifest } = requireConfigPlugins();

module.exports = function withMicrophoneOptional(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest["uses-feature"]) {
      manifest["uses-feature"] = [];
    }

    const existing = manifest["uses-feature"].findIndex(
      (f) => f.$?.["android:name"] === "android.hardware.microphone"
    );

    const entry = {
      $: {
        "android:name": "android.hardware.microphone",
        "android:required": "false",
      },
    };

    if (existing >= 0) {
      manifest["uses-feature"][existing] = entry;
    } else {
      manifest["uses-feature"].push(entry);
    }

    return config;
  });
};
