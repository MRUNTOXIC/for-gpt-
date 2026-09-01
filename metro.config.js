// metro.config.js — Ivanta Property V2
// Permanent fix for slow Metro startup.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// ── 1. Only watch this project's folder ──────────────────────────────────────
// By default Metro watches ancestor directories which pulls in the entire
// IvantaProperties-main repo (Next.js app, .next, .git, parent node_modules).
// Restricting to projectRoot cuts watched file count by ~90%.
config.watchFolders = [projectRoot];

// ── 2. Exclude large internal directories that should never be bundled ────────
// Using simple string-based regex (no lookaheads) so Metro can merge them.
const { blockList } = config.resolver;
const extraBlockPatterns = [
  /mobile-app-v2[/\\]dist[/\\]/,
  /mobile-app-v2[/\\]dist\.old[/\\]/,
  /mobile-app-v2[/\\]android[/\\]/,
  /mobile-app-v2[/\\]ios[/\\]/,
  /mobile-app-v2[/\\]\.expo[/\\]/,
  /mobile-app-v2[/\\]\.expo\.old[/\\]/,
];

// Metro blockList can be a single RegExp or an array — merge safely
if (blockList) {
  const existing = Array.isArray(blockList) ? blockList : [blockList];
  config.resolver.blockList = [...existing, ...extraBlockPatterns];
} else {
  config.resolver.blockList = extraBlockPatterns;
}

// ── 3. Cap workers so the Mac stays responsive ────────────────────────────────
config.maxWorkers = 2;

module.exports = config;
