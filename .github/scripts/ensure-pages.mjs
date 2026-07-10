import { execFileSync } from "node:child_process";

const projectName = process.env.CLOUDFLARE_PAGES_PROJECT_NAME || "mail-reminder";
const productionBranch = process.env.CLOUDFLARE_PAGES_PRODUCTION_BRANCH || "main";

function runWrangler(args) {
  return execFileSync("npx", ["wrangler", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

function listProjects() {
  return JSON.parse(runWrangler(["pages", "project", "list", "--json"]));
}

function hasProject(projects) {
  return projects.some((project) => project.name === projectName);
}

if (!hasProject(listProjects())) {
  console.log(`Pages project "${projectName}" not found. Creating it...`);
  runWrangler([
    "pages",
    "project",
    "create",
    projectName,
    "--production-branch",
    productionBranch,
  ]);
}

console.log(`Using Pages project "${projectName}".`);
