const { withAndroidManifest } = require("@expo/config-plugins");

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
