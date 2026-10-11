import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { basename } from 'node:path';

const testFiles = process.argv.length > 2
	? process.argv.slice(2)
	: readdirSync('tests').filter(file => file.endsWith('.test.ts')).map(file => `tests/${file}`);

mkdirSync('.test-build', { recursive: true });
await build({
	entryPoints: testFiles,
	outdir: '.test-build',
	outExtension: { '.js': '.cjs' },
	bundle: true,
	platform: 'node',
	format: 'cjs',
});
const result = spawnSync(
	process.execPath,
	['--expose-gc', '--test', ...testFiles.map(file => `.test-build/${basename(file, '.ts')}.cjs`)],
	{ stdio: 'inherit' },
);
process.exitCode = result.status ?? 1;
