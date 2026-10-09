import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('.test-build', { recursive: true });
await build({
	entryPoints: ['tests/comment-service.test.ts'],
	outfile: '.test-build/comment-service.test.cjs',
	bundle: true,
	platform: 'node',
	format: 'cjs',
});
const result = spawnSync(process.execPath, ['--test', '.test-build/comment-service.test.cjs'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
