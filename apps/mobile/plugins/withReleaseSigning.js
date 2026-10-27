// Signs release builds with Ledgr's upload key when it's configured, through Gradle properties (locally in
// ~/.gradle/gradle.properties, in CI from secrets): LEDGR_UPLOAD_STORE_FILE, LEDGR_UPLOAD_STORE_PASSWORD,
// LEDGR_UPLOAD_KEY_ALIAS, LEDGR_UPLOAD_KEY_PASSWORD. Without them, release builds keep the debug key, as before.
// The key itself is never in the repository (*.keystore is git-ignored).
const { withAppBuildGradle } = require('expo/config-plugins');

const SIGNING = `
        release {
            if (project.hasProperty('LEDGR_UPLOAD_STORE_FILE')) {
                storeFile file(LEDGR_UPLOAD_STORE_FILE)
                storePassword LEDGR_UPLOAD_STORE_PASSWORD
                keyAlias LEDGR_UPLOAD_KEY_ALIAS
                keyPassword LEDGR_UPLOAD_KEY_PASSWORD
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes('LEDGR_UPLOAD_STORE_FILE')) return cfg;
    gradle = gradle.replace(/signingConfigs \{\n/, (m) => `${m.trimEnd()}${SIGNING}\n`);
    gradle = gradle.replace(
      /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig project.hasProperty('LEDGR_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
