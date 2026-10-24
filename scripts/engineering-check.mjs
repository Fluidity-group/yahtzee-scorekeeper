import {spawnSync} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve, dirname, delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] || 'inspect';
if (!['inspect', 'verify'].includes(mode)) throw new Error('Use inspect or verify');
const config = JSON.parse(readFileSync(resolve(root, 'engineering.json'), 'utf8'));
const runDir = resolve(root, config.evidenceDirectory, new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8));
mkdirSync(runDir, {recursive: true});
function git(args) {
  const result = spawnSync('git', ['-C', root, ...args], {encoding: 'utf8', timeout: 30000, maxBuffer: 16 * 1024 * 1024});
  if (result.status !== 0) throw new Error('Git inspection failed: ' + (result.error?.message || result.stderr));
  return result.stdout;
}
function identity() {
  const paths = git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean).sort();
  const hash = createHash('sha256');
  for (const name of paths) {
    // Evidence never participates in its own source identity.
    if (name.startsWith(config.evidenceDirectory + '/')) continue;
    hash.update(name + '\0');
    const path = resolve(root, name);
    hash.update(existsSync(path) ? readFileSync(path) : '<deleted>');
  }
  return {commit: git(['rev-parse', 'HEAD']).trim(), branch: git(['branch', '--show-current']).trim(), sourceSha256: hash.digest('hex'), dirty: Boolean(git(['status', '--porcelain']).trim())};
}
const report = {schemaVersion: 1, product: config.product, mode, startedAt: new Date().toISOString(), node: process.version, platform: process.platform, checks: [], physicalAcceptance: 'not assessed'};
try {
  report.source = identity();
  writeFileSync(resolve(runDir, 'working-tree.txt'), git(['status', '--short']));
} catch (error) {
  report.passed = false;
  report.error = error.message;
  report.completedAt = new Date().toISOString();
  writeFileSync(resolve(runDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.error(error.message + '\nEvidence: ' + runDir);
  process.exit(1);
}
const missing = config.requiredFiles.filter(name => !existsSync(resolve(root, name)));
report.checks.push({name: 'required engineering records', passed: missing.length === 0, missing});
if (mode === 'verify' && missing.length === 0) {
  for (const check of config.checks) {
    const executable = check.command === '{node}' ? process.execPath : check.command === '{python}' ? process.env.ENGINEERING_PYTHON || 'python3' : check.command;
    console.log('Running ' + check.name);
    const pathEnv = Object.fromEntries(Object.entries(check.envPaths || {}).map(([key, paths]) => [key, paths.map(path => resolve(root, path)).join(delimiter)]));
    const result = spawnSync(executable, check.args, {cwd: root, encoding: 'utf8', env: {...process.env, ...check.env, ...pathEnv}, timeout: check.timeoutMs || 300000, maxBuffer: 32 * 1024 * 1024, shell: false});
    const log = (result.stdout || '') + '\n' + (result.stderr || '') + (result.error ? '\n' + result.error.message : '');
    writeFileSync(resolve(runDir, check.id + '.log'), log);
    report.checks.push({name: check.name, command: [executable, ...check.args], passed: result.status === 0, exitCode: result.status, signal: result.signal, log: check.id + '.log', error: result.error?.message});
    console.log(log.slice(-1800));
    if (result.status !== 0) break;
  }
}
try {
  report.finalSource = identity();
  report.sourceChangedDuringRun = report.source.sourceSha256 !== report.finalSource.sourceSha256;
} catch (error) {
  report.checks.push({name: 'final source identity', passed: false, error: error.message});
}
report.passed = report.checks.every(check => check.passed) && !report.sourceChangedDuringRun;
report.completedAt = new Date().toISOString();
report.scope = config.scope;
writeFileSync(resolve(runDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log('Evidence: ' + runDir);
console.log(report.passed ? (mode === 'inspect' ? 'Inspection passed; tests not run.' : 'Configured verification passed; see scope and skipped tests in logs.') : 'Verification incomplete or failed; inspect report and logs.');
process.exitCode = report.passed ? 0 : 1;
