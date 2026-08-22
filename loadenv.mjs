// Vercel writes .env with CRLF and sometimes a BOM. Either one ends up inside
// the value and turns a perfectly good connection URL into an unparseable one,
// which fails as "not a valid URL" rather than as "your parser is wrong".
import { readFileSync } from "node:fs";

for (const raw of readFileSync(".env.proof", "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
  const at = raw.indexOf("=");
  if (at < 1 || raw.trimStart().startsWith("#")) continue;
  process.env[raw.slice(0, at).trim()] ??= raw.slice(at + 1).trim().replace(/^"|"$/g, "");
}
