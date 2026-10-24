import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const desktopRoot = process.cwd();
const webPackagePath = resolve(desktopRoot, "..", "web", "package.json");
const desktopPackagePath = resolve(desktopRoot, "package.json");
const tauriConfigPath = resolve(desktopRoot, "src-tauri", "tauri.conf.json");
const cargoManifestPath = resolve(desktopRoot, "src-tauri", "Cargo.toml");

const webPackage = JSON.parse(readFileSync(webPackagePath, "utf8"));
const version = String(webPackage.version || "").trim();
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`apps/web/package.json contains an invalid Linka version: ${version || "(empty)"}`);
}

const desktopPackage = JSON.parse(readFileSync(desktopPackagePath, "utf8"));
desktopPackage.version = version;
writeFileSync(desktopPackagePath, JSON.stringify(desktopPackage, null, 2) + "\n", "utf8");

const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, "utf8"));
tauriConfig.version = version;
writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2) + "\n", "utf8");

const cargoManifest = readFileSync(cargoManifestPath, "utf8");
const syncedCargo = cargoManifest.replace(/^(version\s*=\s*")[^"]+(")/m, `$1${version}$2`);
if (syncedCargo === cargoManifest) {
  throw new Error("Could not find [package].version in apps/desktop/src-tauri/Cargo.toml");
}
writeFileSync(cargoManifestPath, syncedCargo, "utf8");

console.log(`Synchronized Linka desktop/Rust manifests to ${version} from apps/web/package.json.`);
