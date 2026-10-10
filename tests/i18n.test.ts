import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t, translate, getLocale, locales, type TranslationKey } from '../src/i18n';

function withLocale<T>(locale: string | undefined, fn: () => T): T {
	const nodeGlobal = globalThis as { window?: unknown };
	const originalWindow = nodeGlobal.window;
	try {
		if (locale !== undefined) {
			nodeGlobal.window = {
				moment: { locale: () => locale },
			};
		} else {
			delete nodeGlobal.window;
		}
		return fn();
	} finally {
		if (originalWindow !== undefined) {
			nodeGlobal.window = originalWindow;
		} else {
			delete nodeGlobal.window;
		}
	}
}

void test('i18n 词典完整性：en 与 zh-cn 均覆盖所有定义的词条 Key', () => {
	const enKeys = Object.keys(locales.en).sort();
	const zhKeys = Object.keys(locales['zh-cn']).sort();

	assert.deepEqual(enKeys, zhKeys, '英文词典与中文词典的 Key 集合必须完全一致');

	for (const key of enKeys) {
		assert.ok(locales.en[key as TranslationKey]?.length > 0, `英文词条 [${key}] 不能为空`);
		assert.ok(locales['zh-cn'][key as TranslationKey]?.length > 0, `中文词条 [${key}] 不能为空`);
	}
});

void test('i18n 语言回退与归一化：zh 前缀归入 zh-cn，其他归入 en', () => {
	withLocale('zh-cn', () => {
		assert.equal(getLocale(), 'zh-cn');
		assert.equal(t('save'), '保存');
		assert.equal(translate('save'), '保存');
	});

	withLocale('zh', () => {
		assert.equal(getLocale(), 'zh-cn');
		assert.equal(t('save'), '保存');
	});

	withLocale('zh-TW', () => {
		assert.equal(getLocale(), 'zh-cn');
		assert.equal(t('save'), '保存');
	});

	withLocale('en', () => {
		assert.equal(getLocale(), 'en');
		assert.equal(t('save'), 'Save');
	});

	withLocale('ja', () => {
		assert.equal(getLocale(), 'en');
		assert.equal(t('save'), 'Save');
	});

	withLocale('fr', () => {
		assert.equal(getLocale(), 'en');
		assert.equal(t('save'), 'Save');
	});

	withLocale(undefined, () => {
		assert.equal(getLocale(), 'en');
		assert.equal(t('save'), 'Save');
	});
});

void test('i18n 错误码翻译：所有错误码均能正确翻译出中英文提示', () => {
	withLocale('zh-cn', () => {
		assert.equal(t('not_utf8'), '备注文件不是合法 UTF-8，无法修改。');
		assert.equal(t('record_limit'), '完整备注记录超过 4096 字节，请缩短输入后重试。');
	});

	withLocale('en', () => {
		assert.equal(t('not_utf8'), 'Description file is not valid UTF-8 and cannot be modified.');
		assert.equal(t('record_limit'), 'Complete comment record exceeds 4096 bytes, please shorten input and try again.');
	});
});
