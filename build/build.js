import * as esbuild from 'esbuild';
import { cpSync, mkdirSync } from 'fs';
import path from 'path';

const isWatch = process.argv.includes('--watch');
const browser = process.env.BROWSER || 'chrome';
const outdir = browser === 'firefox' ? 'dist-firefox' : 'dist';

/** @type {esbuild.BuildOptions} */
const sharedOptions = {
  bundle: true,
  sourcemap: true,
  target: 'es2022',
  format: 'esm',
  outdir,
  define: {
    'process.env.BROWSER': JSON.stringify(browser),
  },
};

// Content script — runs in page context, no module support
const contentScript = {
  ...sharedOptions,
  entryPoints: ['src/content/index.ts'],
  format: 'iife',
  outdir: `${outdir}/content`,
};

// Service worker / background script
const backgroundScript = {
  ...sharedOptions,
  entryPoints: ['src/background/service-worker.ts'],
  outdir: `${outdir}/background`,
};

// Popup
const popupScript = {
  ...sharedOptions,
  entryPoints: ['src/popup/popup.ts'],
  outdir: `${outdir}/popup`,
};

// Side panel
const sidePanelScript = {
  ...sharedOptions,
  entryPoints: ['src/sidepanel/sidepanel.ts'],
  outdir: `${outdir}/sidepanel`,
};

// Site-specific extractors — lazy loaded via dynamic import in content script
// These are built as separate chunks
const extractorScripts = {
  ...sharedOptions,
  entryPoints: [
    'src/content/extractors/github.ts',
    'src/content/extractors/jira.ts',
    'src/content/extractors/slack.ts',
  ],
  format: 'iife',
  outdir: `${outdir}/content/extractors`,
};

async function build() {
  // Copy static assets
  const manifestFile = browser === 'firefox' ? 'manifest.firefox.json' : 'manifest.json';
  mkdirSync(outdir, { recursive: true });
  cpSync(manifestFile, path.join(outdir, 'manifest.json'));

  // Copy HTML files
  mkdirSync(`${outdir}/popup`, { recursive: true });
  mkdirSync(`${outdir}/sidepanel`, { recursive: true });
  cpSync('src/popup/popup.html', `${outdir}/popup/popup.html`);
  cpSync('src/popup/popup.css', `${outdir}/popup/popup.css`);
  cpSync('src/sidepanel/sidepanel.html', `${outdir}/sidepanel/sidepanel.html`);
  cpSync('src/sidepanel/sidepanel.css', `${outdir}/sidepanel/sidepanel.css`);

  // Copy icons if they exist
  try {
    cpSync('icons', `${outdir}/icons`, { recursive: true });
  } catch {
    // Icons directory may not exist yet
  }

  const configs = [contentScript, backgroundScript, popupScript, sidePanelScript, extractorScripts];

  if (isWatch) {
    const contexts = await Promise.all(configs.map((c) => esbuild.context(c)));
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log('Watching for changes...');
  } else {
    await Promise.all(configs.map((c) => esbuild.build(c)));
    console.log(`Built for ${browser} → ${outdir}/`);
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
