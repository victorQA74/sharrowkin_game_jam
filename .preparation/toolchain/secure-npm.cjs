// Run npm with certificate validation even if the parent process disabled it.
const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2);
if (!args.length || !args.every(arg => /^[a-zA-Z0-9@/_.:= -]+$/.test(arg))) {
  throw new Error('Supply plain npm arguments only');
}
const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '1', npm_config_strict_ssl: 'true' };
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
  cwd: __dirname, env, stdio: 'inherit', shell: process.platform === 'win32'
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
