# Productivity (mobile)

Expo React Native app for the CS3053 Productivity project. Primary target: **iOS**.

## Prerequisites

- Node.js 20+ (22 recommended)
- For local iOS builds: **macOS**, Xcode, CocoaPods
- Optional: [Expo account](https://expo.dev) for EAS cloud builds

## Install

```bash
npm install
```

## Develop

```bash
npx expo start
```

| Command | What it does |
| --- | --- |
| `npm start` | Start Metro / Expo dev server |
| `npm run ios` | Open in iOS Simulator (macOS) |
| `npm run run:ios` | Native compile + run (`expo run:ios`) |
| `npm run prebuild:ios` | Generate `ios/` via Continuous Native Generation |
| `npm run android` | Android (secondary) |
| `npm run web` | Web preview |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |

Edit screens under `src/app/`. This app uses [Expo Router](https://docs.expo.dev/router/introduction/).

## iOS configuration

Defined in `app.json`:

- **Name:** Productivity  
- **Bundle ID:** `edu.aup.cs3053.productivity`  
- **Scheme:** `productivity`  

`ios/` and `android/` are **generated** (`expo prebuild`) and gitignored. Configure native behavior in `app.json` / config plugins — do not hand-edit generated folders for long-lived changes.

## EAS Build (cloud iOS)

```bash
npx eas-cli@latest build --platform ios --profile development
npx eas-cli@latest build --platform ios --profile development-simulator
npx eas-cli@latest build --platform ios --profile preview
npx eas-cli@latest build --platform ios --profile production
```

Profiles are in `eas.json`. Development builds need `expo-dev-client` (already installed).

## Fresh blank app shell

```bash
npm run reset-project
```

Moves the starter UI aside and leaves a minimal `src/app` to build from.
