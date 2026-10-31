// Test-only: lets Node resolve the "@/..." imports the site uses (jsconfig paths).
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = new URL("../", import.meta.url);
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    let url = new URL(specifier.slice(2), root);
    if (!existsSync(fileURLToPath(url))) url = new URL(specifier.slice(2) + ".js", root);
    return next(url.href, context);
  }
  if (specifier === "next/server" || specifier === "next/headers") return next(specifier + ".js", context);
  return next(specifier, context);
}
