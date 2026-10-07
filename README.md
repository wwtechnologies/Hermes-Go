# Hermes-Go

Expo/React Native companion app for Hermes Bot Mode. It connects to a running Hermes gateway; it does not run the agent on the phone.

## Included

- Bot roster and persistent Bot Chat, including streamed replies and group rooms.
- Create and edit bot profiles; create 2–6-agent rooms, send group messages, and stop room work.
- Browse, create, resume, archive, and chat in sessions.
- List, create, pause, resume, and remove profile-scoped scheduled routines delivered to Bot Chat.
- Settings for HTTPS gateway sign-in or legacy gateway session-token transport. Tokens are stored with SecureStore on iOS; a password is exchanged for a cookie and one-use WebSocket ticket and is not persisted by the app.
- Embedded HTTPS Hermes WebUI for website capabilities not implemented natively (tasks/kanban, memory, skills, spaces, advanced settings, logs). WebUI authentication is separate from gateway authentication.

This is **not full native parity** with the Hermes website. The WebUI tab is an embedded website on iOS and an external browser link in the web preview. The WebUI must be separately reachable over HTTPS. Portal/OAuth login, multi-gateway room linking, push notifications, offline use, and native editors for all website tools are not implemented.

## Run

```bash
npm install
npx expo start
```

For a quick iPhone preview, make a free Expo account, install Expo Go from the App Store, and sign in to the **same** account in Expo Go and Expo CLI (`npx expo login --browser`). Then run `npx expo start --go` and scan the QR code with your iPhone. Use `npx expo start --go --tunnel` if the phone cannot reach the computer over the local network. Expo SDK 57 includes `react-native-webview` in Expo Go, but this route is still a development preview, not a TestFlight build.

A reachable HTTPS gateway is required on a physical phone (for example via your own trusted Tailscale Serve endpoint); `localhost` on the phone is the phone itself. Never expose a legacy session token over plain HTTP. Set the **separate** HTTPS WebUI address on the WebUI tab if you want website-only tools.

## TestFlight

TestFlight requires a paid Apple Developer Program membership with App Store Connect access and an Expo account. Neither an iOS JavaScript export nor a web preview is an installable signed app. The `production` profile in `eas.json` uses **store distribution** (not ad hoc) and the currently unregistered bundle identifier `com.wwtechnologies.hermesgo`. Verify that identifier belongs to your intended Apple team before the first upload; changing it later creates a different app identity.

After both accounts are ready, sign in to EAS through its browser/device flow and run:

```bash
npx eas-cli@latest login --device
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --profile production
```

The first build prompts for Apple signing and may need an App Store Connect app record or submission credentials. No Apple password, API key, or verification code belongs in this repository. A successful upload is **not** a public App Store release: an internal tester must be on your App Store Connect team, or you must configure an external TestFlight group and pass Apple's Beta App Review. Install Apple's TestFlight app on the test iPhone and accept the invitation there.

## Dependency audit

As checked on October 7, 2026, `npm audit` reports 28 transitive findings (18 high, 10 moderate) under Expo SDK 57. Do **not** use `npm audit fix --force`: its suggestions downgrade Expo/React Native to incompatible major releases. An attempted `decode-uri-component` override made `query-string` throw at runtime and was reverted. Recheck the advisories and upgrade to a compatible patched Expo SDK/dependency graph when one is available before wider distribution; the current audit does not pass.

## Verify

```bash
node --test tests/gateway.test.mjs
npx tsc --noEmit
npx expo lint
npx expo-doctor
npx expo export --platform ios --output-dir dist-ios
npx expo export --platform web --output-dir dist-web
```

The mock gateway (`node tests/mock-gateway.cjs`) is for development-only browser testing on `127.0.0.1:19007`; it does not contact a real Hermes account. The preview images are mock-data screenshots, not live account data. An iOS device build and live-gateway integration remain to be tested.
