// Сборка для Vercel: копия сайта в dist/, свой JS сжимается и запутывается
import { cpSync, rmSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';

const OUT = 'dist';
const SKIP = new Set(['android', 'ios', 'docs', 'node_modules', OUT, 'build.mjs', 'package.json', 'package-lock.json', 'README.md', '.github', '.git', '.gitignore', '.vercelignore']);
rmSync(OUT, { recursive: true, force: true });
for (const f of readdirSync('.')) if (!SKIP.has(f)) cpSync(f, `${OUT}/${f}`, { recursive: true });

const scripts = [...readdirSync(OUT).filter((f) => f.endsWith('.js')), ...readdirSync(`${OUT}/web`).filter((f) => f.endsWith('.js')).map((f) => `web/${f}`)];
for (const f of scripts) {
  const p = `${OUT}/${f}`;
  const min = transformSync(readFileSync(p, 'utf8'), { minify: true, format: 'esm', target: 'es2020', legalComments: 'none' }).code;
  const code = f === 'sw.js' ? min : JavaScriptObfuscator.obfuscate(min, {
    compact: true, target: 'browser', identifierNamesGenerator: 'hexadecimal',
    stringArray: true, stringArrayThreshold: 0.75, stringArrayEncoding: ['base64'], stringArrayRotate: true, stringArrayShuffle: true,
    controlFlowFlattening: false, deadCodeInjection: false, selfDefending: false, renameGlobals: false,
  }).getObfuscatedCode();
  writeFileSync(p, code);
}
for (const c of ['styles.css', 'web/web.css']) writeFileSync(`${OUT}/${c}`, transformSync(readFileSync(`${OUT}/${c}`, 'utf8'), { loader: 'css', minify: true }).code);
console.log('built', OUT);
