// Run npm in the project root with certificate validation forced on,
// because the parent environment has NODE_TLS_REJECT_UNAUTHORIZED=0.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const args = process.argv.slice(2);
if (!args.length || !args.every(arg => /^[a-zA-Z0-9@/_.:= -]+$/.test(arg))) {
  throw new Error('Supply plain npm arguments only');
}
const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '1', npm_config_strict_ssl: 'true' };
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
  cwd: path.resolve(__dirname, '..'), env, stdio: 'inherit', shell: process.platform === 'win32'
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
