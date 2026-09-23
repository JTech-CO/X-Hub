'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const runtimeFiles = Object.freeze([
  'manifest.json', 'background.js', 'content.js', 'vertical.js', 'fetch-interceptor.js',
  'icons/XH16.png', 'icons/XH48.png', 'icons/XH128.png',
]);

function validateRuntime(directory, version) {
  for (const relative of runtimeFiles) {
    const file = path.join(directory, relative);
    if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) throw new Error(`Missing runtime file: ${relative}`);
    if (relative.endsWith('.js')) new vm.Script(fs.readFileSync(file, 'utf8'), { filename: relative });
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  if (manifest.manifest_version !== 3 || !/^\d+(?:\.\d+){0,3}$/.test(manifest.version)) throw new Error('Invalid extension manifest/version');
  if (manifest.version !== version) throw new Error('Version mismatch: package.json and src/manifest.json');
  const entries = [manifest.background?.service_worker, ...Object.values(manifest.icons || {}),
    ...(manifest.content_scripts || []).flatMap(script => [...(script.js || []), ...(script.css || [])])];
  for (const entry of entries) if (!runtimeFiles.includes(entry)) throw new Error(`Manifest references an unpackaged file: ${entry}`);
  return manifest;
}

function build(projectRoot = root) {
  const base = fs.realpathSync(projectRoot);
  const source = path.join(base, 'src');
  const dist = path.join(base, 'dist');
  const version = JSON.parse(fs.readFileSync(path.join(base, 'package.json'), 'utf8')).version;
  validateRuntime(source, version);
  if (fs.existsSync(dist) && (!fs.lstatSync(dist).isDirectory() || fs.lstatSync(dist).isSymbolicLink())) throw new Error('dist must be a normal directory');
  const staging = fs.mkdtempSync(path.join(base, '.dist-build-'));
  const backup = path.join(base, '.dist-backup-' + randomUUID());
  // Only these direct children of the resolved project root may be moved or removed.
  const checkPath = target => {
    if (path.dirname(path.resolve(target)) !== base || ![dist, staging, backup].includes(target)) throw new Error(`Unsafe build path: ${target}`);
  };
  [dist, staging, backup].forEach(checkPath);
  try {
    for (const relative of runtimeFiles) {
      const destination = path.join(staging, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(source, relative), destination);
    }
    validateRuntime(staging, version);
    if (fs.existsSync(dist)) fs.renameSync(dist, backup);
    try { fs.renameSync(staging, dist); }
    catch (error) { if (fs.existsSync(backup)) fs.renameSync(backup, dist); throw error; }
    if (fs.existsSync(backup)) fs.rmSync(backup, { recursive: true });
  } finally {
    if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true });
  }
  return { version, files: runtimeFiles.length, directory: dist };
}

module.exports = { build, validateRuntime, runtimeFiles, root };
if (require.main === module) {
  try { const result = build(); console.log(`Built v${result.version}: ${result.files} runtime files in ${result.directory}`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
