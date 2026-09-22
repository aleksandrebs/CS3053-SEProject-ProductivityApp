#!/usr/bin/env node

/**
 * Reset the project to a blank Expo Router app.
 * Moves or deletes the src and scripts directories, then creates a new src/app entry.
 * You can remove the reset-project script from package.json and delete this file after running it.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const root = process.cwd();
const oldDirs = ["src", "scripts"];
const exampleDir = "example";
const newAppDirSegments = ["src", "app"];
const exampleDirPath = path.join(root, exampleDir);

/** Display paths with the current OS separator (no leading slash). */
function displayPath(...segments) {
  return path.join(...segments);
}

const indexContent = `import { Text, View, StyleSheet } from "react-native";

export default function Index() {
  return (
    <View style={styles.container}>
      <Text>Edit src/app/index.tsx to edit this screen.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
`;

const layoutContent = `import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack />;
}
`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const moveDirectories = async (userInput) => {
  try {
    if (userInput === "y") {
      await fs.promises.mkdir(exampleDirPath, { recursive: true });
      console.log(`Created ${displayPath(exampleDir)}`);
    }

    for (const dir of oldDirs) {
      const oldDirPath = path.join(root, dir);
      if (fs.existsSync(oldDirPath)) {
        if (userInput === "y") {
          const newDirPath = path.join(root, exampleDir, dir);
          await fs.promises.rename(oldDirPath, newDirPath);
          console.log(`Moved ${displayPath(dir)} -> ${displayPath(exampleDir, dir)}`);
        } else {
          await fs.promises.rm(oldDirPath, { recursive: true, force: true });
          console.log(`Deleted ${displayPath(dir)}`);
        }
      } else {
        console.log(`Skipped missing ${displayPath(dir)}`);
      }
    }

    const newAppDirPath = path.join(root, ...newAppDirSegments);
    await fs.promises.mkdir(newAppDirPath, { recursive: true });
    console.log(`\nCreated ${displayPath(...newAppDirSegments)}`);

    const indexPath = path.join(newAppDirPath, "index.tsx");
    await fs.promises.writeFile(indexPath, indexContent);
    console.log(`Created ${displayPath(...newAppDirSegments, "index.tsx")}`);

    const layoutPath = path.join(newAppDirPath, "_layout.tsx");
    await fs.promises.writeFile(layoutPath, layoutContent);
    console.log(`Created ${displayPath(...newAppDirSegments, "_layout.tsx")}`);

    console.log("\nProject reset complete. Next steps:");
    console.log("1. Run `npx expo start` to start a development server.");
    console.log("2. Edit src/app/index.tsx to edit the main screen.");
    console.log(
      "3. Put application code under src; keep screens and layouts in src/app."
    );
    if (userInput === "y") {
      console.log(
        `4. Delete the ${displayPath(exampleDir)} directory when you no longer need it.`
      );
    }
  } catch (error) {
    console.error(`Error during script execution: ${error.message}`);
  }
};

rl.question(
  `Move existing files to ${displayPath(exampleDir)} instead of deleting them? (Y/n): `,
  (answer) => {
    const userInput = answer.trim().toLowerCase() || "y";
    if (userInput === "y" || userInput === "n") {
      moveDirectories(userInput).finally(() => rl.close());
    } else {
      console.log("Invalid input. Please enter Y or N.");
      rl.close();
    }
  }
);
