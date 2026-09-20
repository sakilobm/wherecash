/**
 * @file build-prod-aab.js
 * @description All-in-one automated production build script for WhereCash.
 * 
 * Flow:
 * 1. Sets production environment (APP_ENV=production).
 * 2. Increments version and versionCode in version.json (unless --no-bump is passed).
 * 3. Validates TypeScript compile integrity (tsc --noEmit).
 * 4. Runs Expo prebuild with production config (appId: com.wherecash.app).
 * 5. Compiles signed production AAB bundle via Gradle (bundleRelease).
 * 6. Validates output AAB artifact and prints upload summary for Google Play.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  magenta: "\x1b[35m"
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

const args = process.argv.slice(2);
const shouldBump = !args.includes('--no-bump');
const bumpType = args.includes('--minor') ? 'minor' : (args.includes('--major') ? 'major' : 'patch');

log(`\n======================================================`, colors.bold + colors.cyan);
log(`🚀 WhereCash Production AAB Release Builder`, colors.bold + colors.magenta);
log(`======================================================\n`, colors.bold + colors.cyan);

// ─── 1. Version Handling ───────────────────────────────────────────────────────
const versionPath = path.resolve(__dirname, '../version.json');
let versionInfo = { version: "1.0.0", versionCode: 1 };

if (fs.existsSync(versionPath)) {
  try {
    versionInfo = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
  } catch (e) {
    log(`⚠️  Could not parse version.json, initializing default.`, colors.yellow);
  }
}

const oldVersion = versionInfo.version;
const oldCode = versionInfo.versionCode;

if (shouldBump) {
  versionInfo.versionCode = (versionInfo.versionCode || 0) + 1;
  const parts = versionInfo.version.split('.').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    if (bumpType === 'major') {
      parts[0] += 1;
      parts[1] = 0;
      parts[2] = 0;
    } else if (bumpType === 'minor') {
      parts[1] += 1;
      parts[2] = 0;
    } else {
      parts[2] += 1;
    }
    versionInfo.version = parts.join('.');
  }
  fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2) + '\n', 'utf8');
  log(`📦 Version Auto-Incremented:`, colors.bold + colors.green);
  log(`   Version:     ${oldVersion} ➡️  ${colors.bold}${versionInfo.version}`, colors.green);
  log(`   VersionCode: ${oldCode} ➡️  ${colors.bold}${versionInfo.versionCode}`, colors.green);
} else {
  log(`📦 Version Kept (No-Bump):`, colors.bold + colors.yellow);
  log(`   Version:     ${versionInfo.version}`, colors.yellow);
  log(`   VersionCode: ${versionInfo.versionCode}`, colors.yellow);
}

// ─── 2. Prepare Production Environment ─────────────────────────────────────────
const prodEnv = {
  ...process.env,
  APP_ENV: 'production',
  EAS_BUILD_PROFILE: 'production',
  NODE_ENV: 'production',
  EXPO_IMAGE_UTILS_NO_SHARP: '1'
};

log(`\n🌍 Environment Configured:`, colors.bold + colors.cyan);
log(`   APP_ENV:            production`, colors.cyan);
log(`   EAS_BUILD_PROFILE:  production`, colors.cyan);
log(`   Target Package:     com.wherecash.app`, colors.cyan);

// ─── 3. TypeScript Typecheck ──────────────────────────────────────────────────
if (!args.includes('--no-tsc')) {
  log(`\n🔍 Validating TypeScript Compilation...`, colors.bold + colors.cyan);
  const tscRes = spawnSync('npx', ['tsc', '--noEmit'], {
    shell: true,
    stdio: 'inherit',
    env: prodEnv
  });
  if (tscRes.status !== 0) {
    log(`\n❌ TypeScript compilation check failed! Fix errors above before release.`, colors.bold + colors.red);
    process.exit(1);
  }
  log(`✅ TypeScript compilation clean!`, colors.bold + colors.green);
}

// ─── 4. Expo Prebuild with Production Variables ────────────────────────────────
log(`\n⚙️  Running Expo Prebuild (Production Target)...`, colors.bold + colors.cyan);
const prebuildRes = spawnSync('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install'], {
  shell: true,
  stdio: 'inherit',
  env: prodEnv
});

if (prebuildRes.status !== 0) {
  log(`\n❌ Expo prebuild failed with code ${prebuildRes.status}`, colors.bold + colors.red);
  process.exit(prebuildRes.status || 1);
}
log(`✅ Expo prebuild updated android/ native directory for production.`, colors.bold + colors.green);

// ─── 5. Gradle bundleRelease ───────────────────────────────────────────────────
log(`\n🔨 Compiling Release Bundle with Gradle (bundleRelease)...`, colors.bold + colors.cyan);
const isWindows = process.platform === 'win32';
const gradlewCmd = isWindows ? 'gradlew.bat' : './gradlew';

const gradleRes = spawnSync(gradlewCmd, ['bundleRelease'], {
  cwd: path.resolve(__dirname, '../android'),
  shell: true,
  stdio: 'inherit',
  env: prodEnv
});

if (gradleRes.status !== 0) {
  log(`\n❌ Gradle bundleRelease failed with code ${gradleRes.status}`, colors.bold + colors.red);
  process.exit(gradleRes.status || 1);
}

// ─── 6. Output Artifact Verification ──────────────────────────────────────────
const aabPath = path.resolve(__dirname, '../android/app/build/outputs/bundle/release/app-release.aab');

if (fs.existsSync(aabPath)) {
  const stats = fs.statSync(aabPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  log(`\n======================================================`, colors.bold + colors.green);
  log(`🎉 BUILD SUCCESSFUL! Production AAB Ready!`, colors.bold + colors.green);
  log(`======================================================`, colors.bold + colors.green);
  log(`📁 Artifact Path: ${colors.bold}${aabPath}`, colors.cyan);
  log(`📊 Bundle Size:   ${colors.bold}${sizeMB} MB`, colors.cyan);
  log(`🔖 Version:       ${colors.bold}${versionInfo.version} (versionCode: ${versionInfo.versionCode})`, colors.cyan);
  log(`🏷️  Package:       ${colors.bold}com.wherecash.app`, colors.cyan);
  log(`\n✨ You can now upload this .aab directly to Google Play Console!\n`, colors.bold + colors.green);
} else {
  log(`\n⚠️  Build completed but AAB was not found at expected path:\n   ${aabPath}`, colors.yellow);
}
