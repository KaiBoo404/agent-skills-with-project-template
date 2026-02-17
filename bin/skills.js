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
  sync: handleSync,
  list: handleList,
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

    // Create empty manifest if it doesn't exist
    const manifestPath = path.join(
      process.cwd(),
      ".agents",
      "skills",
      "skills.json"
    );
    if (!fs.existsSync(manifestPath)) {
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
    console.log(`  4. Install skills using Vercel's tool: 'npx skills add <name>'`);
    console.log(`  5. Run 'npx . sync' to update your local skills.json manifest`);
  }
  console.log("");
}

async function handleSync() {
  const skillsDir = path.join(process.cwd(), ".agents", "skills");
  const manifestPath = path.join(skillsDir, "skills.json");

  if (!fs.existsSync(skillsDir)) {
    throw new Error(
      "No .agents/skills/ directory found. Run 'init --full' first."
    );
  }

  console.log(`\n🔄 Syncing skills from ${skillsDir}...\n`);

  // Read existing manifest to preserve sources if possible, or just start fresh?
  // Let's start fresh but try to infer source.
  let manifest = {
    $schema: "https://vibecoding.dev/schemas/skills.json",
    version: "1.0.0",
    skills: {},
  };

  if (fs.existsSync(manifestPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (existing.skills) manifest.skills = existing.skills;
    } catch (e) {
      console.warn("  ⚠️  Could not parse existing skills.json, starting fresh.");
    }
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const detectedSkills = {};

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillName = entry.name;
    const skillPath = path.join(skillsDir, skillName, "SKILL.md");

    if (fs.existsSync(skillPath)) {
      const content = fs.readFileSync(skillPath, "utf-8");
      const metadata = parseFrontmatter(content);

      detectedSkills[skillName] = {
        version: metadata.version || "1.0.0",
        // Preserve existing source if available, otherwise default to 'local'
        source: manifest.skills[skillName]?.source || "local",
        description: metadata.description || "No description provided",
      };

      console.log(`  ✅ Detected ${skillName}`);
    } else {
      console.log(`  ⚠️  Skipping ${skillName} (no SKILL.md found)`);
    }
  }

  // Update manifest with detected skills, removing ones that don't exist anymore
  manifest.skills = detectedSkills;

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\n📄 Updated .agents/skills/skills.json\n`);
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
      "\nNo skills installed. Run 'init --full' first.\n"
    );
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const skills = Object.entries(manifest.skills);

  if (skills.length === 0) {
    console.log("\nNo skills found in manifest.\n");
    return;
  }

  console.log(`\n🧩 Installed Skills (${skills.length}):\n`);

  const core = skills.filter(([, s]) => s.source === "core");
  const registry = skills.filter(([, s]) => s.source === "registry");
  const legacy = skills.filter(([, s]) => s.source === "legacy");
  const local = skills.filter(([, s]) => s.source === "local"); // Or undefined

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

  if (legacy.length > 0) {
    console.log(`\n  LEGACY:`);
    for (const [name, info] of legacy) {
      console.log(`    ${name}@${info.version} — ${info.description}`);
    }
  }

  if (local.length > 0) {
    console.log(`\n  LOCAL/OTHER:`);
    for (const [name, info] of local) {
      console.log(`    ${name}@${info.version} — ${info.description}`);
    }
  }

  console.log("");
}

function handleHelp() {
  console.log(`
  @vibecoding/skills — AI Coding Skills Manager

  USAGE:
    npx @vibecoding/skills <command> [options]

  COMMANDS:
    init              Scaffold Lite context system (AGENTS.md + 2 context files)
    init --full       Scaffold full context system with all files + stubs
    sync              Scan .agents/skills/ and update skills.json manifest
    list              List skills defined in skills.json
    doctor            Verify system health (TODO)

  EXAMPLES:
    npx . init myproject
    npx . sync
    npx . list
  `);
}

// ─── Helpers ───────────────────────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const frontmatter = {};
  const lines = match[1].split(/\r?\n/);

  for (const line of lines) {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join(':').trim();
      frontmatter[key] = value;
    }
  }
  return frontmatter;
}

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
