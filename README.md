# CS3053 Productivity App

AUP CS3053 Software Engineering (Fall 2026) class project.

## Stack

| Layer | Choice |
| --- | --- |
| Mobile | **React Native + Expo** (SDK 57) under [`mobile/`](mobile/) |
| Navigation | Expo Router (file-based) |
| Target | **iOS** first (Android package also configured) |
| Native builds | Local Xcode on macOS, or **EAS Build** in the cloud |

Backend (FastAPI + PostgreSQL) is planned separately — see [`docs/Project-Roles.md`](docs/Project-Roles.md).

## Quick start (mobile)

```bash
cd mobile
npm install
npx expo start
```

Then:

- Press `i` for iOS Simulator (**macOS + Xcode** required), or
- Scan the QR code with **Expo Go** / a **development build** on a physical iPhone

### iOS on a Mac

```bash
cd mobile
npm run prebuild:ios   # generates the ios/ project (gitignored; Continuous Native Generation)
npm run run:ios        # builds and launches in the simulator
```

Requirements: macOS, Xcode, CocoaPods, and an Apple developer account for device installs.

### iOS without a Mac (EAS)

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile development-simulator
```

Build profiles live in [`mobile/eas.json`](mobile/eas.json).

## Project layout

```
mobile/           Expo React Native app
  src/app/        Screens (Expo Router)
  src/components/ UI components
  app.json        App + iOS bundle ID config
  eas.json        EAS Build profiles
docs/             Team process docs
```

iOS bundle identifier: `edu.aup.cs3053.productivity`
