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

Works the same on **Windows** and **macOS** (use PowerShell, Command Prompt, or Terminal).

```bash
cd mobile
npm install
npx expo start
```

Then pick one:

| Machine | How to preview |
| --- | --- |
| Any OS + iPhone | Install [Expo Go](https://expo.dev/go), press `s` for Expo Go mode, scan the QR (same Wi‑Fi), or use `npx expo start --tunnel` |
| Windows | Expo Go on a phone, Android emulator, or `npm run web` |
| macOS | Same as Windows, plus iOS Simulator with `npm run ios` if Xcode is installed |

Repo paths are relative (`mobile/`, `src/app/`). Do not commit absolute paths like `C:\Users\...` or `/Users/...`.

### iOS Simulator (macOS only)

```bash
cd mobile
npm run prebuild:ios
npm run run:ios
```

Needs macOS, Xcode, and CocoaPods.

### iOS builds without a Mac (EAS)

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile development-simulator
```

Profiles: [`mobile/eas.json`](mobile/eas.json).

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
