import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectUrl = String(process.env.LINKA_SUPABASE_URL || process.env.VITE_LINKA_SUPABASE_URL || "").trim().replace(/\/$/, "");
const publishableKey = String(process.env.LINKA_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_LINKA_SUPABASE_PUBLISHABLE_KEY || "").trim();
const config = {
  projectUrl: /^https:\/\//i.test(projectUrl) ? projectUrl : "",
  publishableKey: publishableKey.startsWith("sb_publishable_") || publishableKey.length > 40 ? publishableKey : ""
};
const target = resolve(process.cwd(), "public/linka-config.js");
writeFileSync(target, `globalThis.LINKA_CONFIG = Object.freeze(${JSON.stringify(config)});\n`, "utf8");
if (!config.projectUrl || !config.publishableKey) {
  console.warn("Linka cloud settings are missing; the app will run locally until both public environment variables are configured.");
} else {
  console.log("Linka public cloud endpoint configured.");
}
