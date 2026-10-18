const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
// Windows cmd.exe and Node 20 do not expand CLI wildcards. Discover tests ourselves.
const files = ['__tests__', 'ci'].flatMap(directory => fs.readdirSync(path.join(__dirname, directory))
  .filter(name => name.endsWith('.test.cjs')).map(name => path.join(__dirname, directory, name))).sort();
if (!files.length) throw new Error('No CI/release regression tests found');
const result = spawnSync(process.execPath, ['--test', ...process.argv.slice(2), ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
