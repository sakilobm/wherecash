const fs = require('fs');
const path = require('path');
const versionInfo = require('./version.json');

// Simple helper to load environment variables from a file into process.env
function loadEnvFile(fileName) {
  const filePath = path.resolve(__dirname, fileName);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) return;

    const match = trimmedLine.match(/^([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';

      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);

      process.env[key] = value.trim();
    }
  });
}

// 1. Resolve environment target (defaults to development, detects EAS profile)
const easProfile = process.env.EAS_BUILD_PROFILE || 'development';
const appEnv = process.env.APP_ENV || (easProfile === 'production' ? 'production' : 'development');
console.log(`[app.config.js] Bootstrapping configuration for environment: "${appEnv}" (EAS Profile: "${easProfile}")`);

// 2. Load the targeted env file (.env.development or .env.production)
loadEnvFile(`.env.${appEnv}`);

// 3. Load machine-local secrets (.env.local) if present
loadEnvFile('.env.local');

module.exports = {
  expo: {
    name: process.env.APP_NAME || "WhereCash",
    slug: "WhereCash",
    version: versionInfo.version,
    orientation: "portrait",
    icon: "./assets/app-icon/Icon-512x512.png",
    userInterfaceStyle: "dark",
    scheme: "wherecash",
    ios: {
      supportsTablet: true,
      bundleIdentifier: process.env.APP_PACKAGE || "com.wherecash.app"
    },
    splash: {
      image: "./assets/app-icon/Icon-512x512.png",
      resizeMode: "contain",
      backgroundColor: "#080C14",
      dark: {
        image: "./assets/app-icon/Icon-512x512.png",
        backgroundColor: "#080C14"
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#F7F8F2",
        foregroundImage: "./assets/app-icon/Icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/app-icon/Icon-Monochrome.png"
      },
      package: process.env.APP_PACKAGE || "com.wherecash.app",
      versionCode: versionInfo.versionCode,
      predictiveBackGestureEnabled: false
    },
    web: {
      bundler: "metro",
      favicon: "./assets/app-icon/Icon-48x48.png"
    },
    router: {
      root: "src/app"
    },
    plugins: [
      "expo-router",
      "expo-font",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#080C14",
          "image": "./assets/app-icon/Icon-512x512.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "dark": {
            "backgroundColor": "#080C14",
            "image": "./assets/app-icon/Icon-512x512.png"
          }
        }
      ],
      [
        "expo-secure-store",
        {
          "faceIDPermission": "Allow WhereCash to access Face ID for secure authentication."
        }
      ],
      "expo-notifications",
      "./plugins/withAndroidSigning"
    ],
    experiments: {
      "typedRoutes": true
    },
    extra: {
      router: {
        origin: false
      }
    }
  }
};
