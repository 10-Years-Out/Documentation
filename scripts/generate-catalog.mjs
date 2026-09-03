#!/usr/bin/env node

import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DATE_TABLE_RE =
  /(?:<!-- GENERATED dates\. Sourced from frontmatter\. -->\s*)?\| Board approved \| Next review \|\n\| --- \| --- \|\n\|[^\n]*\|\n*/;

const PREFERRED_CATEGORIES = ["infosec", "bsa"];

export function parseFrontmatter(text) {
  if (!text.startsWith("---")) {
    return { data: {}, body: text };
  }
  const close = text.indexOf("\n---", 3);
  if (close === -1) {
    return { data: {}, body: text };
  }
  const raw = text.slice(4, close).trim();
  const body = text.slice(close + 4).replace(/^\n/, "");
  const data = {};
  for (const line of raw.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!match) continue;
    data[match[1]] = parseYamlScalar(match[2]);
  }
  return { data, body };
}

export function parseYamlScalar(raw) {
  const value = raw.trim();
  if (value === "" || value === "null" || value === "~") return null;
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function formatDate(value) {
  if (value == null || value === "") return "";
  const text = String(value).trim();
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : text;
}

export function displayTitle(title, policyId) {
  if (!title) return "";
  if (policyId && title.startsWith(`${policyId} `)) {
    return title.slice(policyId.length + 1);
  }
  return title;
}

export function categoryLabel(folder) {
  const special = { infosec: "Infosec", bsa: "BSA" };
  if (special[folder]) return special[folder];
  return folder
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function dateTableMarkdown(boardApproved, nextReview) {
  return `<!-- GENERATED dates. Sourced from frontmatter. -->

| Board approved | Next review |
| --- | --- |
| ${formatDate(boardApproved)} | ${formatDate(nextReview)} |
`;
}

export function upsertDateTable(body, boardApproved, nextReview) {
  const table = dateTableMarkdown(boardApproved, nextReview).trimEnd();
  const withoutTable = body.replace(DATE_TABLE_RE, "");
  const heading = withoutTable.search(/^## /m);
  if (heading === -1) {
    return `${withoutTable.replace(/\s*$/, "\n\n")}${table}\n`;
  }
  const before = withoutTable.slice(0, heading).replace(/\s*$/, "\n\n");
  return `${before}${table}\n\n${withoutTable.slice(heading)}`;
}

function mdTable(headers, rows) {
  const head = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.join(" | ")} |`);
  return [head, divider, ...body].join("\n");
}

async function readIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  return readFile(filePath, "utf8");
}

async function listDirectories(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

async function listMdxFiles(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
    .map((entry) => entry.name)
    .sort();
}

function sortCategories(folders) {
  const preferred = PREFERRED_CATEGORIES.filter((name) => folders.includes(name));
  const rest = folders.filter((name) => !PREFERRED_CATEGORIES.includes(name)).sort();
  return [...preferred, ...rest];
}

function comparePolicies(a, b) {
  const rank = (category) => {
    const index = PREFERRED_CATEGORIES.indexOf(category);
    return index === -1 ? PREFERRED_CATEGORIES.length : index;
  };
  if (rank(a.category) !== rank(b.category)) {
    return rank(a.category) - rank(b.category);
  }
  if (a.category !== b.category) {
    return a.category.localeCompare(b.category);
  }
  return a.policyId.localeCompare(b.policyId);
}

async function loadPolicyFile(filePath) {
  const text = await readFile(filePath, "utf8");
  const { data, body } = parseFrontmatter(text);
  const filename = path.basename(filePath, ".mdx");
  return {
    filePath,
    filename,
    data,
    body,
    text,
    policyId: data.policy_id || filename.toUpperCase(),
    title: data.title || filename,
    version: data.version || "",
  };
}

async function loadBankShortName(bankDir, folder) {
  const bankFile = path.join(bankDir, "bank.mdx");
  const text = await readIfExists(bankFile);
  if (!text) return folder;
  const { data } = parseFrontmatter(text);
  const match = text.match(/\|\s*Short name\s*\|\s*([^|]+)\|/i);
  if (match) return match[1].trim();
  return data.title || folder;
}

async function collectTemplates(root) {
  const templatesDir = path.join(root, "templates");
  const categories = sortCategories(
    (await listDirectories(templatesDir)).filter((name) => name !== "images")
  );
  const templates = [];
  for (const category of categories) {
    const dir = path.join(templatesDir, category);
    for (const name of await listMdxFiles(dir)) {
      if (name === "overview.mdx") continue;
      const policy = await loadPolicyFile(path.join(dir, name));
      templates.push({ ...policy, category });
    }
  }
  templates.sort(comparePolicies);
  return templates;
}

async function collectBanks(root, templates) {
  const banksDir = path.join(root, "banks");
  const folders = await listDirectories(banksDir);
  const banks = [];
  for (const folder of folders) {
    const bankDir = path.join(banksDir, folder);
    const shortName = await loadBankShortName(bankDir, folder);
    const categories = sortCategories(
      (await listDirectories(bankDir)).filter((name) => !["images"].includes(name))
    );
    const policies = [];
    for (const category of categories) {
      for (const name of await listMdxFiles(path.join(bankDir, category))) {
        const policy = await loadPolicyFile(path.join(bankDir, category, name));
        policies.push({ ...policy, category });
      }
    }
    policies.sort(comparePolicies);
    banks.push({ folder, shortName, bankDir, policies });
  }
  return banks;
}

function adoptedBy(template, banks) {
  return banks
    .filter((bank) =>
      bank.policies.some(
        (policy) =>
          policy.filename === template.filename && policy.category === template.category
      )
    )
    .map((bank) => bank.shortName)
    .join(", ");
}

function templateCatalogMarkdown(templates, banks) {
  const rows = templates.map((template) => [
    template.policyId,
    displayTitle(template.title, template.policyId),
    template.version,
    adoptedBy(template, banks),
  ]);
  return `---
title: "Template catalog"
---

<!-- GENERATED from frontmatter. Do not edit by hand. -->

${mdTable(["Policy ID", "Title", "Version", "Adopted by"], rows)}
`;
}

function bankOverviewMarkdown(bank) {
  const rows = bank.policies.map((policy) => [
    policy.policyId,
    displayTitle(policy.title, policy.policyId),
    policy.version,
    formatDate(policy.data.board_approved),
    formatDate(policy.data.next_review),
  ]);
  return `---
title: "${bank.shortName} policies"
---

<!-- GENERATED from frontmatter. Do not edit by hand. -->

${mdTable(["Policy ID", "Title", "Version", "Board approved", "Next review"], rows)}
`;
}

function pagePath(filePath, root) {
  return path
    .relative(root, filePath)
    .replace(/\\/g, "/")
    .replace(/\.mdx$/, "");
}

function buildNavigation(root, templates, banks) {
  const templateCategories = sortCategories([...new Set(templates.map((t) => t.category))]);
  const templatesGroup = {
    group: "Templates",
    pages: [
      "templates/overview",
      ...templateCategories.map((category) => ({
        group: categoryLabel(category),
        pages: templates
          .filter((template) => template.category === category)
          .sort((a, b) => a.filename.localeCompare(b.filename))
          .map((template) => pagePath(template.filePath, root)),
      })),
    ],
  };

  const banksGroup = {
    group: "Banks",
    pages: banks.map((bank) => {
      const pages = [`banks/${bank.folder}/overview`];
      if (existsSync(path.join(bank.bankDir, "bank.mdx"))) {
        pages.push(`banks/${bank.folder}/bank`);
      }
      const categories = sortCategories([...new Set(bank.policies.map((p) => p.category))]);
      for (const category of categories) {
        pages.push({
          group: categoryLabel(category),
          pages: bank.policies
            .filter((policy) => policy.category === category)
            .sort((a, b) => a.filename.localeCompare(b.filename))
            .map((policy) => pagePath(policy.filePath, root)),
        });
      }
      return { group: bank.shortName, pages };
    }),
  };

  return [templatesGroup, banksGroup];
}

async function maybeWrite(filePath, content, write) {
  const current = await readIfExists(filePath);
  const next = content.endsWith("\n") ? content : `${content}\n`;
  if (current === next) {
    return false;
  }
  if (write) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, next, "utf8");
  }
  return true;
}

export async function generate({ root, write = true } = {}) {
  const templates = await collectTemplates(root);
  const banks = await collectBanks(root, templates);
  const changed = [];

  const catalogPath = path.join(root, "templates", "overview.mdx");
  if (await maybeWrite(catalogPath, templateCatalogMarkdown(templates, banks), write)) {
    changed.push(path.relative(root, catalogPath));
  }

  for (const bank of banks) {
    const overviewPath = path.join(bank.bankDir, "overview.mdx");
    if (await maybeWrite(overviewPath, bankOverviewMarkdown(bank), write)) {
      changed.push(path.relative(root, overviewPath));
    }
  }

  const policyFiles = [...templates, ...banks.flatMap((bank) => bank.policies)];
  for (const policy of policyFiles) {
    const nextBody = upsertDateTable(
      policy.body,
      policy.data.board_approved,
      policy.data.next_review
    );
    const close = policy.text.indexOf("\n---", 3);
    const nextText =
      close === -1
        ? nextBody
        : `${policy.text.slice(0, close + 4)}\n\n${nextBody.replace(/^\n+/, "")}`;
    if (await maybeWrite(policy.filePath, nextText, write)) {
      changed.push(path.relative(root, policy.filePath));
    }
  }

  const docsPath = path.join(root, "docs.json");
  const docsRaw = await readFile(docsPath, "utf8");
  const docs = JSON.parse(docsRaw);
  const generatedGroups = buildNavigation(root, templates, banks);
  const existing = docs.navigation?.groups || [];
  const extras = existing.filter(
    (group) => group.group !== "Templates" && group.group !== "Banks"
  );
  docs.navigation = docs.navigation || {};
  docs.navigation.groups = [...generatedGroups, ...extras];
  const nextDocs = `${JSON.stringify(docs, null, 2)}\n`;
  if (docsRaw !== nextDocs) {
    if (write) {
      await writeFile(docsPath, nextDocs, "utf8");
    }
    changed.push(path.relative(root, docsPath));
  }

  return { changed, templates, banks };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const check = process.argv.includes("--check");
  const { changed } = await generate({ root, write: !check });
  if (check && changed.length > 0) {
    console.error("Generated catalog files are out of date:");
    for (const file of changed) console.error(`  ${file}`);
    console.error("\nRun: node scripts/generate-catalog.mjs");
    process.exit(1);
  }
  if (changed.length === 0) {
    console.log(check ? "Catalog files are up to date." : "No catalog files changed.");
  } else {
    console.log("Updated:");
    for (const file of changed) console.log(`  ${file}`);
  }
}
