#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const AGENTS = "AGENTS.md";
const PROJECT_STATE = "docs/PROJECT_STATE.md";

/** Kaynak sayılan yollar: bu dosyalar değişince proje durumu da güncellenmeli. */
const CODE_PREFIXES = ["src/", "tests/", "public/", ".github/", "scripts/"];
const CODE_FILES = new Set([
  "package.json",
  "package-lock.json",
  "vite.config.ts",
  "vitest.config.ts",
  "index.html",
]);

const REQUIRED_SECTIONS = new Map([
  [AGENTS, ["## Zorunlu dokümantasyon protokolü", "## Komutlar", "## Doğrulama"]],
  [
    PROJECT_STATE,
    ["## Son güncelleme", "## Son değişiklik günlüğü", "## Doğrulama durumu"],
  ],
]);

let failed = false;

function fail(message) {
  failed = true;
  console.error(`✗ ${message}`);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function isCodeFile(file) {
  return CODE_PREFIXES.some((prefix) => file.startsWith(prefix)) || CODE_FILES.has(file);
}

for (const [file, sections] of REQUIRED_SECTIONS) {
  if (!existsSync(file)) {
    fail(`${file} bulunamadı.`);
    continue;
  }
  const content = readFileSync(file, "utf8");
  for (const section of sections) {
    if (!content.includes(section)) {
      fail(`${file} içinde "${section}" bölümü eksik.`);
    }
  }
}

const base = (process.env.DOCS_BASE_REF ?? "").trim();
let changed = [];

if (base && /^0+$/.test(base)) {
  console.log("· Yeni dal/ilk push algılandı; diff kontrolü atlandı.");
} else if (base) {
  try {
    git(["cat-file", "-e", `${base}^{commit}`]);
    changed = git(["diff", "--name-only", base, "HEAD"]).split("\n").filter(Boolean);
  } catch {
    console.log(`· ${base} yerelde bulunamadı; diff kontrolü atlandı.`);
  }
} else {
  try {
    const tracked = git(["diff", "--name-only", "HEAD"]).split("\n").filter(Boolean);
    const untracked = git(["ls-files", "--others", "--exclude-standard"])
      .split("\n")
      .filter(Boolean);
    changed = [...new Set([...tracked, ...untracked])];
  } catch {
    console.log("· Git farkı okunamadı; diff kontrolü atlandı.");
  }
}

const codeChanged = changed.filter(isCodeFile);

if (codeChanged.length > 0 && !changed.includes(PROJECT_STATE)) {
  fail(
    [
      "Kaynak dosyalar değişti ama docs/PROJECT_STATE.md güncellenmedi.",
      "Bu değişiklik için:",
      "  1. Son güncelleme alanını yenile.",
      "  2. Son değişiklik günlüğüne tarihli bir madde ekle.",
      "  3. Etkilenen mimari, test ve sınırlamaları güncelle.",
      "Değişen kaynak dosyalar:",
      ...codeChanged.map((file) => `  - ${file}`),
    ].join("\n"),
  );
}

if (!failed) {
  if (codeChanged.length > 0) {
    ok(`Dokümantasyon güncel; ${codeChanged.length} kaynak dosya değişikliği kapsandı.`);
  } else {
    ok("Dokümantasyon kontrolü geçti; kaynak değişikliği yok.");
  }
}

if (failed) process.exit(1);
