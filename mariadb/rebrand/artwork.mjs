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
  // Activity bar: the MariaDB Code mark (designed for it; monochrome, the IDE tints it). It is
  // shipped under a content-hashed name: VS Code caches the icon by URL, and installing the same
  // extension version again would keep showing the previous artwork.
  copyAsset(
    'mariadb-code-ext.svg',
    'packages/vscode-ide-companion/assets/sidebar-icon.svg',
  );
  {
    const svg = fs.readFileSync(path.join(assets, 'mariadb-code-ext.svg'));
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
  {
    const inner = appIcon.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    const jsx = `function IconQwenLogo() {\n  return (\n    <svg viewBox="0 0 1204 1204" aria-hidden="true">\n      ${inner.replaceAll('fill-rule', 'fillRule')}\n    </svg>\n  );\n}`;
    patch(
      'web-shell sidebar logo',
      'packages/web-shell/client/components/sidebar/WebShellSidebar.tsx',
      /function IconQwenLogo\(\) \{\n {2}return \(\n {4}<svg viewBox="17\.5 27\.7 135\.6 135\.6"[\s\S]*?<\/svg>\n {2}\);\n\}/,
      () => jsx,
      // The pre-commit hook reformats the JSX, so look for the new artwork's viewBox only.
      (t) => t.includes('<svg viewBox="0 0 1204 1204"'),
    );
  }
  patch(
    'web-shell sidebar logo test',
    'packages/web-shell/client/components/sidebar/WebShellSidebar.brand.test.tsx',
    `container.querySelector('svg[viewBox="17.5 27.7 135.6 135.6"]')`,
    `container.querySelector('svg[viewBox="0 0 1204 1204"]')`,
    (t) => t.includes(`svg[viewBox="0 0 1204 1204"]`),
  );
  patch(
    'web-shell favicon test',
    'packages/web-shell/client/index-html.test.ts',
    "expect(href).toContain('%23082DFF');",
    "expect(href).toContain('%23003545');",
    (t) => t.includes("expect(href).toContain('%23003545');"),
  );

  // Favicon of exported HTML transcripts.
  {
    const file = 'packages/web-templates/src/export-html/src/favicon.svg';
    if (!exists(file)) failures.push(`export favicon: ${file} is gone`);
    else write(file, sealMono.replace('fill="currentColor"', 'fill="#003545"'));
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
  // Web Shell welcome screen: the seal above "Welcome to MariaDB Code", and a tighter line spacing
  // when that title wraps (narrow side panels).
  {
    const viewBox = sealMono.match(/viewBox="([^"]+)"/)[1];
    const d = sealMono.match(/ d="([^"]+)"/)[1];
    write(
      'packages/web-shell/client/components/WelcomeSeal.tsx',
      `/** The MariaDB seal (mariadb/assets/seal-mono.svg), in the text color. */\n` +
        `export function WelcomeSeal({ className }: { className?: string }) {\n` +
        `  return (\n` +
        `    <svg className={className} viewBox="${viewBox}" aria-hidden="true">\n` +
        `      <path\n` +
        `        fill="currentColor"\n` +
        `        fillRule="evenodd"\n` +
        `        d="${d}"\n` +
        `      />\n` +
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
    // The product name in the welcome title takes the gradient of mariadb.com's "Agentic
    // Enterprise" heading (class text-sublime-gradient), shown there on a dark background. The dark
    // theme (first definition) uses its colors, the light theme (second) darker shades of them
    // (contrast above 4:1 on the white panel; the originals are 1.2-1.6:1).
    const gradient = (cyan, green, lime) =>
      [
        '--agent-logo-gradient: linear-gradient(',
        '    90deg,',
        `    ${cyan} 0%,`,
        '    25%,',
        `    ${green} 50%,`,
        '    75%,',
        `    ${lime} 100%`,
        '  );',
      ].join('\n');
    const darkGradient = gradient('#51d9f7', '#8ce786', '#cdf70a');
    const lightGradient = gradient('#0b85a6', '#2f8a3b', '#5f7a00');
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
