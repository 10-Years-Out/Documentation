import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  displayTitle,
  formatDate,
  parseFrontmatter,
  upsertDateTable,
  generate,
} from "./generate-catalog.mjs";

function templatePolicy(id, title) {
  return `---
title: "${title}"
policy_id: ${id}
version: "1.0"
last_updated: 2026-09-02
---

| Board approved | Next review |
| --- | --- |
|  |  |

## 1. Purpose

Template purpose text.
`;
}

function bankPolicy({ title, id, template, board, next, extraSection = "" }) {
  return `---
title: "${title}"
policy_id: ${id}
version: "1.0"
board_approved: ${board ?? ""}
next_review: ${next ?? ""}
template: ${template}
template_synced: 2026-09-02
---

<img src="/banks/example/images/logo.png" alt="Example" height="48" />

| Board approved | Next review |
| --- | --- |
|  |  |

## 1. Purpose

Bank purpose text.
${extraSection}`;
}

async function writeTree(root, files) {
  for (const [relative, contents] of Object.entries(files)) {
    const full = path.join(root, relative);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, contents, "utf8");
  }
}

{
  const { data, body } = parseFrontmatter(`---
title: "ISP-014 Access Control"
policy_id: "ISP-014"
board_approved: null
next_review:
template_synced: 2026-09-02T00:00:00.000Z
---

## 1. Purpose
`);
  assert.equal(data.title, "ISP-014 Access Control");
  assert.equal(data.policy_id, "ISP-014");
  assert.equal(data.board_approved, null);
  assert.equal(data.next_review, null);
  assert.match(body, /## 1\. Purpose/);
  assert.equal(formatDate("2026-09-02T00:00:00.000Z"), "2026-09-02");
  assert.equal(formatDate(null), "");
  assert.equal(displayTitle("ISP-014 Access Control", "ISP-014"), "Access Control");
}

{
  const updated = upsertDateTable(
    `<img src="/logo.png" alt="Bank" height="48" />\n\n## 1. Purpose\n`,
    "2026-01-15",
    "2027-01-15"
  );
  assert.match(updated, /\| 2026-01-15 \| 2027-01-15 \|/);
  assert.match(updated, /## 1\. Purpose/);
  assert.doesNotMatch(updated, /## 1\. Purpose[\s\S]*## 1\. Purpose/);
}

const fixture = await mkdtemp(path.join(os.tmpdir(), "catalog-"));
try {
  await writeTree(fixture, {
    "docs.json": JSON.stringify(
      {
        name: "Policy Documentation",
        navigation: { groups: [{ group: "Templates", pages: [] }] },
      },
      null,
      2
    ),
    "templates/infosec/isp-014-access-control.mdx": templatePolicy(
      "ISP-014",
      "ISP-014 Access Control"
    ),
    "templates/bsa/bsa-003-wire-transfer.mdx": templatePolicy(
      "BSA-003",
      "BSA-003 Wire Transfer"
    ),
    "templates/infosec/isp-015-logging.mdx": templatePolicy("ISP-015", "ISP-015 Logging"),
    "banks/fcnb-st-paris/bank.mdx": `---
title: "FCNB St. Paris"
---

| Field | Value |
| --- | --- |
| Short name | FCNB St. Paris |
`,
    "banks/fcnb-st-paris/infosec/isp-014-access-control.mdx": bankPolicy({
      title: "ISP-014 Access Control",
      id: "ISP-014",
      template: "isp-014-access-control",
      board: "2026-03-01",
      next: "2027-03-01",
    }),
    "banks/fcnb-st-paris/bsa/bsa-003-wire-transfer.mdx": bankPolicy({
      title: "BSA-003 Wire Transfer",
      id: "BSA-003",
      template: "bsa-003-wire-transfer",
    }),
    "banks/hslc-kenton/bank.mdx": `---
title: "HSLC Kenton"
---

| Field | Value |
| --- | --- |
| Short name | HSLC Kenton |
`,
    "banks/hslc-kenton/infosec/isp-014-access-control.mdx": bankPolicy({
      title: "ISP-014 Access Control",
      id: "ISP-014",
      template: "isp-014-access-control",
    }),
  });

  const { changed } = await generate({ root: fixture, write: true });
  assert.ok(changed.includes("templates/overview.mdx"));
  assert.ok(changed.includes("docs.json"));

  const catalog = await readFile(path.join(fixture, "templates/overview.mdx"), "utf8");
  assert.match(catalog, /ISP-014 \| Access Control \| 1.0 \| FCNB St. Paris, HSLC Kenton/);
  assert.match(catalog, /BSA-003 \| Wire Transfer \| 1.0 \| FCNB St. Paris/);
  assert.match(catalog, /ISP-015 \| Logging \| 1.0 \|  \|/);
  assert.ok(catalog.indexOf("ISP-014") < catalog.indexOf("ISP-015"));
  assert.ok(catalog.indexOf("ISP-015") < catalog.indexOf("BSA-003"));

  const fcnbOverview = await readFile(
    path.join(fixture, "banks/fcnb-st-paris/overview.mdx"),
    "utf8"
  );
  assert.match(fcnbOverview, /ISP-014 \| Access Control \| 1.0 \| 2026-03-01 \| 2027-03-01/);
  assert.match(fcnbOverview, /BSA-003 \| Wire Transfer \| 1.0 \|  \|  \|/);
  assert.doesNotMatch(fcnbOverview, /ISP-015/);

  const fcnbPolicy = await readFile(
    path.join(fixture, "banks/fcnb-st-paris/infosec/isp-014-access-control.mdx"),
    "utf8"
  );
  assert.match(fcnbPolicy, /board_approved: 2026-03-01/);
  assert.match(fcnbPolicy, /\| 2026-03-01 \| 2027-03-01 \|/);
  assert.match(fcnbPolicy, /Bank purpose text/);

  const docs = JSON.parse(await readFile(path.join(fixture, "docs.json"), "utf8"));
  const templatePages = docs.navigation.groups[0].pages;
  const infosec = templatePages.find((page) => page.group === "Infosec");
  assert.deepEqual(infosec.pages, [
    "templates/infosec/isp-014-access-control",
    "templates/infosec/isp-015-logging",
  ]);
  const hslc = docs.navigation.groups[1].pages.find((page) => page.group === "HSLC Kenton");
  const hslcInfosec = hslc.pages.find((page) => page.group === "Infosec");
  assert.deepEqual(hslcInfosec.pages, ["banks/hslc-kenton/infosec/isp-014-access-control"]);
  assert.equal(
    hslc.pages.find((page) => page.group === "BSA"),
    undefined
  );

  const second = await generate({ root: fixture, write: true });
  assert.deepEqual(second.changed, []);

  const stale = await generate({ root: fixture, write: false });
  assert.deepEqual(stale.changed, []);
} finally {
  await rm(fixture, { recursive: true, force: true });
}

console.log("ok");
