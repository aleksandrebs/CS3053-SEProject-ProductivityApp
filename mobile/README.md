# Productivity (mobile)

Expo React Native app for the CS3053 Productivity project. Primary target: **iOS**.

## Prerequisites

- Node.js 20+ (22 recommended) on Windows or macOS
- For local iOS Simulator builds: **macOS**, Xcode, CocoaPods
- Optional: [Expo account](https://expo.dev) for EAS cloud builds

## Install

From this `mobile` folder (PowerShell, cmd, or Terminal):

```bash
npm install
```

## Develop

```bash
npx expo start
```

| Command | What it does | Windows | macOS |
| --- | --- | --- | --- |
| `npm start` | Start Metro / Expo | Yes | Yes |
| `npm run web` | Web preview | Yes | Yes |
| `npm run android` | Android emulator / device | Yes | Yes |
| `npm run ios` | iOS Simulator | No | Yes (Xcode) |
| `npm run run:ios` | Native compile + run | No | Yes (Xcode) |
| `npm run prebuild:ios` | Generate `ios/` (gitignored) | Generates files* | Yes |
| `npm run lint` | ESLint | Yes | Yes |
| `npm run typecheck` | TypeScript check | Yes | Yes |

\* `prebuild:ios` can generate an `ios` folder on any OS, but compiling/running it needs a Mac.

For phones on a different network than your PC, use:

```bash
npx expo start --tunnel --go
```

Edit screens under `src/app/`. This app uses [Expo Router](https://docs.expo.dev/router/introduction/).

## Path conventions (Windows + macOS)

- All project paths are **relative** to the repo or `mobile/` folder.
- In JS/TS and configs, prefer module paths like `@/components/...` or `./assets/...` (forward slashes). Node, Metro, and npm normalize these on Windows.
- Scripts that touch the filesystem use Node’s `path.join` (see `scripts/reset-project.js`).
- Line endings are normalized via the root `.gitattributes` file (`LF` for source).

## iOS configuration

Defined in `app.json`:

- **Name:** Productivity
- **Bundle ID:** `edu.aup.cs3053.productivity`
- **Scheme:** `productivity`

`ios/` and `android/` are **generated** (`expo prebuild`) and gitignored. Configure native behavior in `app.json` / config plugins — do not hand-edit generated folders for long-lived changes.

## EAS Build (cloud iOS)

Works from Windows or macOS:

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
