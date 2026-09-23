const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build, runtimeFiles, root } = require('../scripts/build.cjs');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'xhub-build-test-'));
  t.after(() => {
    const resolved = path.resolve(directory);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('xhub-build-test-')) throw new Error('Unsafe test cleanup path');
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  fs.cpSync(path.join(root, 'src'), path.join(directory, 'src'), { recursive: true });
  fs.copyFileSync(path.join(root, 'package.json'), path.join(directory, 'package.json'));
  return directory;
}

test('build copies only runtime assets, removes stale files and preserves source bytes', t => {
  const directory = fixture(t);
  fs.mkdirSync(path.join(directory, 'dist'));
  fs.writeFileSync(path.join(directory, 'dist', 'stale.js'), 'old build');
  fs.writeFileSync(path.join(directory, 'src', 'private-notes.txt'), 'not for release');
  const result = build(directory);
  assert.equal(result.files, 8);
  assert.equal(fs.existsSync(path.join(result.directory, 'stale.js')), false);
  assert.equal(fs.existsSync(path.join(result.directory, 'private-notes.txt')), false);
  for (const file of runtimeFiles) assert.deepEqual(fs.readFileSync(path.join(result.directory, file)), fs.readFileSync(path.join(directory, 'src', file)));
  build(directory);
  assert.equal(fs.readdirSync(directory).some(name => name.startsWith('.dist-')), false);
});

test('invalid source leaves the previous installed build intact', t => {
  const directory = fixture(t);
  const { directory: dist } = build(directory);
  const original = fs.readFileSync(path.join(dist, 'content.js'));
  fs.writeFileSync(path.join(directory, 'src', 'content.js'), 'function {');
  assert.throws(() => build(directory), SyntaxError);
  assert.deepEqual(fs.readFileSync(path.join(dist, 'content.js')), original);
});

test('missing runtime files and manifest references are rejected', t => {
  const directory = fixture(t);
  const manifestPath = path.join(directory, 'src', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  manifest.content_scripts[0].js.push('missing.js');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  assert.throws(() => build(directory), /unpackaged file: missing.js/);
  fs.unlinkSync(path.join(directory, 'src', 'icons', 'XH16.png'));
  assert.throws(() => build(directory), /Missing runtime file/);
});

test('package and extension versions must agree', t => {
  const directory = fixture(t);
  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ version: '0.0.0' }));
  assert.throws(() => build(directory), /Version mismatch/);
  assert.equal(fs.existsSync(path.join(directory, 'dist')), false);
});
