// Cho phép `node --test` hiểu đường dẫn "@/..." giống tsconfig (paths: "@/*" → "./*").
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
const ROOT = ${JSON.stringify(process.cwd())};
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = ROOT + "/" + specifier.slice(2);
    for (const cand of [base, base + ".ts", base + ".tsx", base + "/index.ts"]) {
      if (existsSync(cand) && !cand.endsWith("/")) {
        try { if ((await import("node:fs")).statSync(cand).isFile()) return next(pathToFileURL(cand).href, context); } catch {}
      }
    }
  }
  return next(specifier, context);
}
`),
  import.meta.url
);
