// app.json is the configuration. LEDGR_DEMO=1 builds a separate copy for screenshots and demos, with its own app ID
// and storage, so it installs beside the real Ledgr without touching its data:
//   LEDGR_DEMO=1 npx expo prebuild -p android && npx expo run:android --variant release
// Run a plain prebuild afterwards to go back to the real app.
module.exports = ({ config }) =>
  process.env.LEDGR_DEMO === '1'
    ? { ...config, name: 'Ledgr Demo', scheme: 'ledgrdemo', android: { ...config.android, package: 'com.ledgr.app.demo' } }
    : config;
