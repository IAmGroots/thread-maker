// Pushes Supabase migrations (`supabase db push`) without prompting for the
// database password on every run.
//
// The password is read, in order of precedence, from:
//   1. process.env.SUPABASE_DB_PASSWORD (e.g. CI or an exported shell var)
//   2. the .env.local file in the project root
//   3. the .env file in the project root
//
// If none is found, the command prints how to add it and exits non-zero.
//
// Usage: npm run db:push

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function readEnvFile(file) {
  const path = join(projectRoot, file);
  if (!existsSync(path)) return {};
  const entries = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }
  return entries;
}

const password =
  process.env.SUPABASE_DB_PASSWORD ||
  readEnvFile(".env.local").SUPABASE_DB_PASSWORD ||
  readEnvFile(".env").SUPABASE_DB_PASSWORD;

if (!password) {
  console.error(
    [
      "",
      "SUPABASE_DB_PASSWORD is not set.",
      "",
      "Add it once to .env.local (project root):",
      "",
      "  SUPABASE_DB_PASSWORD=your-database-password",
      "",
      "Find or reset it in the Supabase dashboard:",
      "  Project Settings -> Database -> Database password -> Reset",
      "",
      "Then run `npm run db:push` again.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const supabaseBin = process.platform === "win32" ? "supabase.cmd" : "supabase";
const binPath = join(projectRoot, "node_modules", ".bin", supabaseBin);
const cliArgs = ["db", "push", "--password", password];

// On Windows the CLI is a .cmd shim, which must run through cmd.exe. Passing
// the shim path as an argument (rather than using `shell: true`) keeps a
// project path that contains spaces intact.
const command =
  process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : binPath;
const args = process.platform === "win32" ? ["/c", binPath, ...cliArgs] : cliArgs;

const child = spawn(command, args, {
  stdio: "inherit",
  cwd: projectRoot,
});

child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (error) => {
  console.error("Failed to run the Supabase CLI:", error.message);
  process.exit(1);
});
