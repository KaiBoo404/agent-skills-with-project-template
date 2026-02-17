#!/usr/bin/env node

/**
 * @vibecoding/skills CLI
 *
 * Usage:
 *   npx @vibecoding/skills init          — Scaffold the Lite context system (3 files)
 *   npx @vibecoding/skills init --full   — Scaffold the full context system
 *   npx @vibecoding/skills add <name>    — Install a skill from the registry
 *   npx @vibecoding/skills remove <name> — Remove an installed skill
 *   npx @vibecoding/skills list          — List installed skills
 *   npx @vibecoding/skills search <q>    — Search the skill registry
 */

const fs = require("fs");
const path = require("path");

const COMMANDS = {
  init: handleInit,
  add: handleAdd,
  remove: handleRemove,
  list: handleList,
  search: handleSearch,
  help: handleHelp,
};

const TEMPLATES_DIR = path.join(__dirname, "..", "templates");

// ─── Entry Point ───────────────────────────────────────────────────────

const [, , command, ...args] = process.argv;

if (!command || command === "--help" || command === "-h") {
  handleHelp();
  process.exit(0);
}

const handler = COMMANDS[command];
if (!handler) {
  console.error(`❌ Unknown command: "${command}"\n`);
  handleHelp();
  process.exit(1);
}

handler(args).catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});

// ─── Commands ──────────────────────────────────────────────────────────

async function handleInit(args) {
  const isFull = args.includes("--full");
  const projectName =
    args.find((a) => !a.startsWith("--")) ||
    path.basename(process.cwd());

  console.log(`\n🚀 Initializing Vibe Coding context system...`);
  console.log(`   Project: ${projectName}`);
  console.log(`   Mode: ${isFull ? "Full" : "Lite"}\n`);

  // Create directories
  const dirs = [".context", ".context/specs", ".agents/skills"];
  if (isFull) {
    dirs.push(".context/specs/.archive", ".github");
  }

  for (const dir of dirs) {
    fs.mkdirSync(path.join(process.cwd(), dir), { recursive: true });
    console.log(`  📁 Created ${dir}/`);
  }

  // AGENTS.md — always created
  writeTemplate("AGENTS.md", "AGENTS.md", { PROJECT_NAME: projectName });
  console.log(`  📄 Created AGENTS.md`);

  // .context/project.md — always created
  writeTemplate("project.md", ".context/project.md", {
    PROJECT_NAME: projectName,
  });
  console.log(`  📄 Created .context/project.md`);

  // .context/conventions.md — always created
  writeTemplate("conventions.md", ".context/conventions.md", {});
  console.log(`  📄 Created .context/conventions.md`);

  if (isFull) {
    // Full mode adds architecture, stack, template, stubs, skills manifest
    writeTemplate("architecture.md", ".context/architecture.md", {
      PROJECT_NAME: projectName,
    });
    console.log(`  📄 Created .context/architecture.md`);

    writeTemplate("stack.md", ".context/stack.md", {});
    console.log(`  📄 Created .context/stack.md`);

    writeTemplate("_template.md", ".context/specs/_template.md", {});
    console.log(`  📄 Created .context/specs/_template.md`);

    // Agent compatibility stubs
    const stubContent = [
      "Read and follow all instructions in AGENTS.md at the project root.",
      "Read the .context/ directory for project-specific knowledge.",
      "Skills are in .agents/skills/ — load only when relevant to the current task.",
      "",
    ].join("\n");

    writeFile(".cursorrules", stubContent);
    console.log(`  📄 Created .cursorrules`);

    writeFile(".github/copilot-instructions.md", stubContent);
    console.log(`  📄 Created .github/copilot-instructions.md`);

    // Skills manifest
    const manifest = {
      $schema: "https://vibecoding.dev/schemas/skills.json",
      version: "1.0.0",
      skills: {},
    };
    writeFile(
      ".agents/skills/skills.json",
      JSON.stringify(manifest, null, 2) + "\n"
    );
    console.log(`  📄 Created .agents/skills/skills.json`);
  }

  console.log(`\n✅ Done! Your project is ready for Vibe Coding.`);
  console.log(`\nNext steps:`);
  console.log(`  1. Fill in {PROJECT_NAME} placeholders in AGENTS.md`);
  console.log(`  2. Edit .context/project.md with your product details`);
  console.log(`  3. Edit .context/conventions.md with your coding standards`);
  if (!isFull) {
    console.log(
      `  4. Run with --full flag later to add architecture, stack, and skills`
    );
  } else {
    console.log(
      `  4. Run 'npx @vibecoding/skills add <name>' to install skills`
    );
  }
  console.log("");
}

async function handleAdd(args) {
  const skillName = args[0];
  if (!skillName) {
    throw new Error("Please specify a skill name: npx @vibecoding/skills add <name>");
  }

  const manifestPath = path.join(
    process.cwd(),
    ".agents",
    "skills",
    "skills.json"
  );

  // Ensure manifest exists
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      "No skills.json found. Run 'npx @vibecoding/skills init --full' first."
    );
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  if (manifest.skills[skillName]) {
    console.log(`ℹ️  Skill "${skillName}" is already installed.`);
    return;
  }

  // TODO: In v1.0, fetch from registry. For now, create a stub.
  const skillDir = path.join(
    process.cwd(),
    ".agents",
    "skills",
    skillName
  );
  fs.mkdirSync(skillDir, { recursive: true });

  const stubSkill = [
    "---",
    `name: ${skillName}`,
    `description: TODO — describe what this skill does`,
    "version: 1.0.0",
    "---",
    "",
    `# ${skillName}`,
    "",
    "TODO: Add skill instructions here.",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(skillDir, "SKILL.md"), stubSkill);

  // Update manifest
  manifest.skills[skillName] = {
    version: "1.0.0",
    source: "local",
    description: "TODO — describe what this skill does",
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  console.log(`\n✅ Installed skill: ${skillName}`);
  console.log(`   Edit: .agents/skills/${skillName}/SKILL.md`);
  console.log(`   Manifest updated: .agents/skills/skills.json\n`);
}

async function handleRemove(args) {
  const skillName = args[0];
  if (!skillName) {
    throw new Error(
      "Please specify a skill name: npx @vibecoding/skills remove <name>"
    );
  }

  const manifestPath = path.join(
    process.cwd(),
    ".agents",
    "skills",
    "skills.json"
  );

  if (!fs.existsSync(manifestPath)) {
    throw new Error("No skills.json found.");
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  if (!manifest.skills[skillName]) {
    console.log(`ℹ️  Skill "${skillName}" is not installed.`);
    return;
  }

  // Remove directory
  const skillDir = path.join(
    process.cwd(),
    ".agents",
    "skills",
    skillName
  );
  if (fs.existsSync(skillDir)) {
    fs.rmSync(skillDir, { recursive: true, force: true });
  }

  // Update manifest
  delete manifest.skills[skillName];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  console.log(`\n✅ Removed skill: ${skillName}`);
  console.log(`   Manifest updated: .agents/skills/skills.json\n`);
}

async function handleList() {
  const manifestPath = path.join(
    process.cwd(),
    ".agents",
    "skills",
    "skills.json"
  );

  if (!fs.existsSync(manifestPath)) {
    console.log(
      "\nNo skills installed. Run 'npx @vibecoding/skills init --full' first.\n"
    );
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const skills = Object.entries(manifest.skills);

  if (skills.length === 0) {
    console.log("\nNo skills installed.\n");
    return;
  }

  console.log(`\n🧩 Installed Skills (${skills.length}):\n`);

  const core = skills.filter(([, s]) => s.source === "core");
  const registry = skills.filter(([, s]) => s.source === "registry");
  const local = skills.filter(([, s]) => s.source === "local");

  if (core.length > 0) {
    console.log("  CORE:");
    for (const [name, info] of core) {
      console.log(`    ${name}@${info.version} — ${info.description}`);
    }
  }

  if (registry.length > 0) {
    console.log(`\n  REGISTRY:`);
    for (const [name, info] of registry) {
      console.log(`    ${name}@${info.version} — ${info.description}`);
    }
  }

  if (local.length > 0) {
    console.log(`\n  LOCAL:`);
    for (const [name, info] of local) {
      console.log(`    ${name}@${info.version} — ${info.description}`);
    }
  }

  console.log("");
}

async function handleSearch(args) {
  const query = args.join(" ");
  if (!query) {
    throw new Error(
      "Please specify a search query: npx @vibecoding/skills search <query>"
    );
  }

  // TODO: In v1.0, search a remote registry
  console.log(`\n🔍 Searching for "${query}"...\n`);
  console.log(
    "  Registry search is not yet available. Coming in v1.0.\n"
  );
  console.log(
    "  For now, browse available skills at: https://github.com/vibecoding/skills-registry\n"
  );
}

function handleHelp() {
  console.log(`
  @vibecoding/skills — AI Coding Skills Manager

  USAGE:
    npx @vibecoding/skills <command> [options]

  COMMANDS:
    init              Scaffold Lite context system (AGENTS.md + 2 context files)
    init --full       Scaffold full context system with all files + stubs
    add <name>        Install a skill
    remove <name>     Remove a skill
    list              List installed skills
    search <query>    Search the skill registry

  EXAMPLES:
    npx @vibecoding/skills init myproject
    npx @vibecoding/skills init --full
    npx @vibecoding/skills add dotnet-best-practices
    npx @vibecoding/skills list
  `);
}

// ─── Helpers ───────────────────────────────────────────────────────────

function writeTemplate(templateName, outputPath, replacements) {
  const templatePath = path.join(TEMPLATES_DIR, templateName);
  let content;

  if (fs.existsSync(templatePath)) {
    content = fs.readFileSync(templatePath, "utf-8");
    for (const [key, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
  } else {
    // Fallback: template not found, create minimal placeholder
    content = `# ${templateName}\n\nTODO: Configure this file.\n`;
  }

  writeFile(outputPath, content);
}

function writeFile(relativePath, content) {
  const fullPath = path.join(process.cwd(), relativePath);
  const dir = path.dirname(fullPath);
  fs.mkdirSync(dir, { recursive: true });

  // Don't overwrite existing files
  if (fs.existsSync(fullPath)) {
    console.log(`  ⏭️  Skipped ${relativePath} (already exists)`);
    return;
  }

  fs.writeFileSync(fullPath, content);
}
