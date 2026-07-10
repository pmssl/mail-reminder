import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const databaseName = process.env.D1_DATABASE_NAME || "mail_reminder";
const githubEnv = process.env.GITHUB_ENV;

function runWrangler(args) {
  return execFileSync("npx", ["wrangler", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

function listDatabases() {
  return JSON.parse(runWrangler(["d1", "list", "--json"]));
}

function findDatabaseId(databases) {
  const database = databases.find((item) => item.name === databaseName);
  return database?.uuid || database?.id || database?.database_id || "";
}

let databaseId = findDatabaseId(listDatabases());

if (!databaseId) {
  console.log(`D1 database "${databaseName}" not found. Creating it...`);
  runWrangler(["d1", "create", databaseName]);
  databaseId = findDatabaseId(listDatabases());
}

if (!databaseId) {
  throw new Error(`Unable to resolve D1 database id for "${databaseName}"`);
}

const wranglerConfigPath = "wrangler.toml";
const wranglerConfig = readFileSync(wranglerConfigPath, "utf8");
const patchedConfig = wranglerConfig.replace(
  /database_id\s*=\s*"[^"]*"/,
  `database_id = "${databaseId}"`,
);

if (patchedConfig === wranglerConfig) {
  throw new Error("Unable to patch database_id in wrangler.toml");
}

writeFileSync(wranglerConfigPath, patchedConfig);

if (githubEnv) {
  appendFileSync(githubEnv, `D1_DATABASE_ID=${databaseId}\n`);
}

console.log(`Using D1 database "${databaseName}" (${databaseId}).`);
