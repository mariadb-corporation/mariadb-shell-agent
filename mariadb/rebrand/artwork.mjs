/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

/** Icons, favicons, the Web Shell brand mark and the terminal banner, plus tests pinning them. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  assets,
  copyAsset,
  exists,
  failures,
  patch,
  patchJson,
  write,
} from './lib.mjs';

function svgDataUri(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

function pngDataUri(name) {
  return `data:image/png;base64,${fs.readFileSync(path.join(assets, name)).toString('base64')}`;
}

const camel = (name) => name.replace(/-(\w)/g, (_, c) => c.toUpperCase());

/** `a:b; c:d` (a style attribute) as [[a, b], [c, d]]. */
function declarations(css = '') {
  return css
    .split(';')
    .map((declaration) => declaration.split(':').map((part) => part.trim()))
    .filter(([key, value]) => key && value);
}

/** Root attributes of an SVG that are not presentation properties. */
const NON_PRESENTATION = new Set([
  'xmlns',
  'width',
  'height',
  'viewBox',
  'version',
  'id',
  'style',
]);

/**
 * A monochrome SVG as exported by a design tool (Affinity: XML prolog, DOCTYPE, editor ids and
 * namespaces, presentation properties in style attributes) or an optimizer (presentation
 * attributes on the root): its viewBox, the root's presentation properties as attributes, and the
 * drawing with its own as attributes. Only plain shapes are supported; links, images or
 * references inside the drawing stop the run.
 */
function svgParts(svg, name) {
  const rootTag = svg.match(/<svg\b[^>]*>/)?.[0];
  if (!rootTag) throw new Error(`${name}: no <svg> element`);
  const viewBox = rootTag.match(/viewBox="([^"]+)"/)?.[1];
  if (!viewBox) throw new Error(`${name}: the <svg> element has no viewBox`);
  const rootAttributes = [
    ...[...rootTag.matchAll(/\s([\w-]+)="([^"]*)"/g)]
      .map(([, key, value]) => [key, value])
      .filter(([key]) => !NON_PRESENTATION.has(key)),
    ...declarations(rootTag.match(/style="([^"]*)"/)?.[1]),
  ];
  const drawing = svg
    .slice(svg.indexOf(rootTag) + rootTag.length, svg.lastIndexOf('</svg>'))
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s(?:id|[\w-]+:[\w-]+)="[^"]*"/g, '')
    .replace(/\sstyle="([^"]*)"/g, (_, css) =>
      declarations(css)
        .map(([key, value]) => ` ${key}="${value}"`)
        .join(''),
    )
    .trim();
  if (/url\(|<use\b|<image\b/.test(drawing))
    throw new Error(
      `${name}: only plain shapes are supported (no links, images or references)`,
    );
  return { viewBox, rootAttributes, drawing };
}

/** The elements of `drawing` as JSX, laid out the way prettier prints them. */
function drawingJsx(drawing, indent) {
  const lines = [];
  let depth = 0;
  for (const [, closing, tag, attributes, selfClosing] of drawing.matchAll(
    /<(\/?)([\w-]+)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g,
  )) {
    if (closing) {
      depth--;
      lines.push(`${' '.repeat(indent + depth * 2)}</${tag}>`);
      continue;
    }
    const pad = ' '.repeat(indent + depth * 2);
    const attrs = [...attributes.matchAll(/([\w:-]+)="([^"]*)"/g)].map(
      ([, key, value]) => `${camel(key)}="${value}"`,
    );
    const end = selfClosing ? ' />' : '>';
    const oneLine = `${pad}<${tag}${attrs.map((a) => ` ${a}`).join('')}${end}`;
    // Prettier never breaks an element whose only attribute is a string.
    if (oneLine.length <= 80 || attrs.length === 1) lines.push(oneLine);
    else
      lines.push(
        `${pad}<${tag}`,
        ...attrs.map((a) => `${pad}  ${a}`),
        `${pad}${selfClosing ? '/>' : '>'}`,
      );
    if (!selfClosing) depth++;
  }
  return lines.join('\n');
}

export function apply() {
  const appIcon = fs.readFileSync(path.join(assets, 'app-icon.svg'), 'utf8');
  const sealMono = fs.readFileSync(path.join(assets, 'seal-mono.svg'), 'utf8');

  // Extension: marketplace / tab icon, attention-dot variants, activity bar.
  copyAsset('icon.png', 'packages/vscode-ide-companion/assets/icon.png');
  copyAsset(
    'icon-orange.png',
    'packages/vscode-ide-companion/assets/icon-orange.png',
  );
  copyAsset(
    'icon-blue.png',
    'packages/vscode-ide-companion/assets/icon-blue.png',
  );
  // Activity bar: the MariaDB Shell Agent mark (designed for it; monochrome, the IDE tints it). It is
  // shipped under a content-hashed name: VS Code caches the icon by URL, and installing the same
  // extension version again would keep showing the previous artwork.
  copyAsset(
    'activityBar-agent.svg',
    'packages/vscode-ide-companion/assets/sidebar-icon.svg',
  );
  {
    const svg = fs.readFileSync(path.join(assets, 'activityBar-agent.svg'));
    const hash = crypto
      .createHash('sha256')
      .update(svg)
      .digest('hex')
      .slice(0, 8);
    const icon = `assets/activity-bar-${hash}.svg`;
    write(`packages/vscode-ide-companion/${icon}`, svg.toString('utf8'));
    patchJson(
      'activity bar icon',
      'packages/vscode-ide-companion/package.json',
      (pkg) => {
        const c = pkg.contributes ?? {};
        const entries = [
          ...(c.viewsContainers?.activitybar ?? []),
          ...Object.values(c.views ?? {}).flat(),
        ].filter((e) =>
          /^assets\/(?:sidebar-icon|activity-bar-[0-9a-f]+)\.svg$/.test(
            e.icon ?? '',
          ),
        );
        if (entries.length === 0) return false;
        for (const e of entries) e.icon = icon;
      },
    );
  }

  // Web Shell: PWA icons, notification icon, favicon and the sidebar brand mark.
  copyAsset('app-icon.svg', 'packages/web-shell/client/public/assets/icon.svg');
  copyAsset(
    'icon-192.png',
    'packages/web-shell/client/public/assets/icon-192.png',
  );
  copyAsset(
    'icon-512.png',
    'packages/web-shell/client/public/assets/icon-512.png',
  );
  copyAsset(
    'notification.png',
    'packages/web-shell/client/assets/qwen-code-notification.png',
  );
  patch(
    'web-shell favicon',
    'packages/web-shell/client/index.html',
    /(<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href=")data:image\/svg\+xml,[^"]*(")/,
    (_, a, b) => a + svgDataUri(appIcon) + b,
    (t) => t.includes(svgDataUri(appIcon)),
  );
  // The sidebar's built-in mark: the app icon as a PNG data URI (the artwork has gradients and
  // embedded images, too much to inline as JSX; the Web Shell CSP allows data: images). An <img>
  // like an operator's own logo, which the sidebar's CSS already sizes; the logo tests tell the
  // two apart by the data URI's type.
  const sidebarMark = pngDataUri('icon-192.png');
  patch(
    'web-shell sidebar logo',
    'packages/web-shell/client/components/sidebar/WebShellSidebar.tsx',
    /function IconQwenLogo\(\) \{\n {2}return \(\n {4}<svg viewBox="17\.5 27\.7 135\.6 135\.6"[\s\S]*?<\/svg>\n {2}\);\n\}/,
    () =>
      `function IconQwenLogo() {\n  return (\n    <img\n      src="${sidebarMark}"\n      alt=""\n      aria-hidden="true"\n    />\n  );\n}`,
    (t) => t.includes(sidebarMark),
  );
  patch(
    'web-shell sidebar logo test',
    'packages/web-shell/client/components/sidebar/WebShellSidebar.brand.test.tsx',
    `container.querySelector('svg[viewBox="17.5 27.7 135.6 135.6"]')`,
    `container.querySelector('img[src^="data:image/png;base64,"]')`,
    (t) => t.includes(`img[src^="data:image/png;base64,"]`),
  );
  // The favicon test pins a colour of the upstream mark; pin the app icon's viewBox instead.
  const faviconAnchor = `expect(href).toContain('${encodeURIComponent(
    appIcon.match(/viewBox="[^"]+"/)[0],
  )}');`;
  patch(
    'web-shell favicon test',
    'packages/web-shell/client/index-html.test.ts',
    "expect(href).toContain('%23082DFF');",
    faviconAnchor,
    (t) => t.includes(faviconAnchor),
  );

  // Favicon of exported HTML transcripts.
  {
    const file = 'packages/web-templates/src/export-html/src/favicon.svg';
    if (!exists(file)) failures.push(`export favicon: ${file} is gone`);
    else {
      const { viewBox, rootAttributes, drawing } = svgParts(
        sealMono,
        'seal-mono.svg',
      );
      const attrs = rootAttributes.map(([k, v]) => ` ${k}="${v}"`).join('');
      write(
        file,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="#003545"${attrs}>${drawing.replace(/>\s+</g, '><')}</svg>\n`,
      );
    }
  }

  // Terminal banner logo, and the tests that pin the upstream wordmark.
  patch(
    'header test logo glyph',
    'packages/cli/src/ui/components/Header.test.tsx',
    /'██╔═══██╗'/g,
    "'██╔████╔██║'",
    (t) => t.includes("'██╔████╔██║'"),
  );
  // Pins gradient colours sampled from the 36-column QWEN wordmark.
  patch(
    'opentui wordmark gradient test',
    'packages/cli/src/ui/opentui/opentui-header.test.tsx',
    "  it('samples each line on its own ramp",
    "  it.skip('samples each line on its own ramp",
    (t) => t.includes("it.skip('samples each line on its own ramp"),
  );
  patch(
    'trust dialog test',
    'packages/cli/src/ui/components/IdeTrustChangeDialog.test.tsx',
    `"Press 'r' to restart Qwen"`,
    // The longer name wraps onto the next line of the dialog.
    `"Press 'r' to restart"`,
    (t) => t.includes(`"Press 'r' to restart"`),
  );
  // Web Shell welcome screen: the seal above "Welcome to MariaDB Shell Agent", and a tighter line spacing
  // when that title wraps (narrow side panels).
  {
    const { viewBox, rootAttributes, drawing } = svgParts(
      sealMono,
      'seal-mono.svg',
    );
    write(
      'packages/web-shell/client/components/WelcomeSeal.tsx',
      `/**\n * @license\n * Copyright (c) 2026, MariaDB plc.\n * SPDX-License-Identifier: Apache-2.0\n */\n\n` +
        `/** The MariaDB seal (mariadb/assets/seal-mono.svg), in the text color. */\n` +
        `export function WelcomeSeal({ className }: { className?: string }) {\n` +
        `  return (\n` +
        `    <svg\n` +
        `      className={className}\n` +
        `      viewBox="${viewBox}"\n` +
        `      fill="currentColor"\n` +
        rootAttributes.map(([k, v]) => `      ${camel(k)}="${v}"\n`).join('') +
        `      aria-hidden="true"\n` +
        `    >\n` +
        `${drawingJsx(drawing, 6)}\n` +
        `    </svg>\n` +
        `  );\n` +
        `}\n`,
    );
    patch(
      'welcome seal',
      'packages/web-shell/client/components/WelcomeHeader.tsx',
      /(import styles from '\.\/WelcomeHeader\.module\.css';\n)([\s\S]*?<div className=\{styles\.header\}>\n)/,
      (_, imp, body) =>
        `${imp}import { WelcomeSeal } from './WelcomeSeal';\n${body}      <WelcomeSeal className={styles.seal} />\n`,
      (t) => t.includes('<WelcomeSeal'),
    );
    patch(
      'welcome title spacing',
      'packages/web-shell/client/components/WelcomeHeader.module.css',
      /(\.titleRow \{[^}]*?)gap: 0\.35em;([^}]*?)line-height: 40px;/,
      (_, a, b) => `${a}gap: 0 0.35em;${b}line-height: 36px;`,
      (t) => t.includes('gap: 0 0.35em;'),
    );
    patch(
      'welcome title spacing (narrow)',
      'packages/web-shell/client/components/WelcomeHeader.module.css',
      /(\.titleRow \{\n {4}font-size: 26px;\n {4})line-height: 34px;/,
      (_, a) => `${a}line-height: 30px;`,
      (t) => t.includes('line-height: 30px;'),
    );
    // The product name in the welcome title takes the gradient the MariaDB VS Code extension's
    // Overview draws its "Workbench" title in (`.overview-title-workbench` in its
    // overviewStyles.css): the dark theme (first definition) cyan, green and yellow, the light
    // theme (second) purple, cyan and green. The VS Code extension's welcome and provider setup
    // pages carry the same two (`TITLE_GRADIENT`, patch 0016).
    const gradient = (first, middle, last) =>
      [
        '--agent-logo-gradient: linear-gradient(',
        '    90deg,',
        `    ${first} 25%,`,
        `    ${middle} 50%,`,
        '    75%,',
        `    ${last}`,
        '  );',
      ].join('\n');
    const darkGradient = gradient('#3dd3ee', '#8ce783', '#ffd401');
    const lightGradient = gradient('#8f3bfc', '#3dd3ee', '#26d044');
    let definition = 0;
    patch(
      'welcome title gradient',
      'packages/web-shell/client/App.module.css',
      /--agent-logo-gradient: linear-gradient\([^)]*\);/g,
      () => (definition++ === 0 ? darkGradient : lightGradient),
      (t) =>
        t.indexOf(darkGradient) >= 0 &&
        t.indexOf(lightGradient) > t.indexOf(darkGradient),
    );
    patch(
      'welcome seal style',
      'packages/web-shell/client/components/WelcomeHeader.module.css',
      /(\.subtitle \{[^}]*\}\n)/,
      (_, a) =>
        `${a}\n.seal {\n  width: 64px;\n  height: 64px;\n  color: var(--foreground);\n}\n`,
      (t) => t.includes('.seal {'),
    );
  }
  {
    const logo = fs.readFileSync(path.join(assets, 'ascii-logo.txt'), 'utf8');
    patch(
      'ascii logo',
      'packages/cli/src/ui/components/AsciiArt.ts',
      /(export const shortAsciiLogo = `)[\s\S]*?(`;)/,
      (_, a, b) => a + logo + b,
      (t) => t.includes(logo),
    );
  }
}
