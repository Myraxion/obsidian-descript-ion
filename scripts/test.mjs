import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('.test-build', { recursive: true });
await build({
	entryPoints: ['tests/comment-service.test.ts', 'tests/file-tree-tooltip.test.ts'],
	outdir: '.test-build',
	outExtension: { '.js': '.cjs' },
	bundle: true,
	platform: 'node',
	format: 'cjs',
	plugins: [{
		name: 'tooltip-runtime-boundary',
		setup(builder) {
			builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: new URL('../tests/fixtures/obsidian-tooltip.ts', import.meta.url).pathname.replace(/^\/(\w:)/, '$1') }));
		},
	}],
});
const result = spawnSync(process.execPath, ['--test', '.test-build/comment-service.test.cjs', '.test-build/file-tree-tooltip.test.cjs'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
