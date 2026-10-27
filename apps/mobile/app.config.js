// app.json is the configuration; this adds what's computed.
//
// versionCode comes from the version (0.2.0 → 200, 1.4.12 → 10412), so raising the version in app.json is all a
// release needs: Android only installs an update with a higher versionCode.
//
// LEDGR_DEMO=1 builds a separate copy for screenshots and demos, with its own app ID and storage, so it installs
// beside the real Ledgr without touching its data:
//   LEDGR_DEMO=1 npx expo prebuild -p android && npx expo run:android --variant release
// Run a plain prebuild afterwards to go back to the real app.
const versionCode = (version) => {
  const [major, minor, patch] = version.split('.').map(Number);
  if ([major, minor, patch].some((n) => !Number.isInteger(n) || n < 0) || minor > 99 || patch > 99) throw new Error(`Version must be x.y.z with y and z below 100, not "${version}"`);
  return major * 10000 + minor * 100 + patch;
};

module.exports = ({ config }) => {
  const app = { ...config, android: { ...config.android, versionCode: versionCode(config.version) } };
  return process.env.LEDGR_DEMO === '1' ? { ...app, name: 'Ledgr Demo', scheme: 'ledgrdemo', android: { ...app.android, package: 'com.ledgr.app.demo' } } : app;
};
