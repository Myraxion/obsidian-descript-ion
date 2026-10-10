import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('.test-build', { recursive: true });
await build({
	entryPoints: {
		'comment-service.test': 'tests/comment-service.test.ts',
		'i18n.test': 'tests/i18n.test.ts',
	},
	outdir: '.test-build',
	outExtension: { '.js': '.cjs' },
	bundle: true,
	platform: 'node',
	format: 'cjs',
});
const result = spawnSync(
	process.execPath,
	['--test', '.test-build/comment-service.test.cjs', '.test-build/i18n.test.cjs'],
	{ stdio: 'inherit' },
);
process.exitCode = result.status ?? 1;
