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

Use an iOS development build for native modules such as WebView; Expo Go may not include all required native code. A reachable HTTPS gateway is required on a physical phone (for example via your own trusted Tailscale Serve endpoint); `localhost` on the phone is the phone itself. Never expose a legacy session token over plain HTTP. Set the **separate** HTTPS WebUI address on the WebUI tab if you want website-only tools.

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
