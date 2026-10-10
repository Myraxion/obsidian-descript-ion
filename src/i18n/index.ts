import { en } from './en';
import { zhCn } from './zh-cn';

export type TranslationKey = keyof typeof zhCn;
export type SupportedLocale = 'en' | 'zh-cn';

export const locales: Record<SupportedLocale, Record<TranslationKey, string>> = {
	en,
	'zh-cn': zhCn,
};

export function normalizeLocale(locale: string | null | undefined): SupportedLocale {
	if (!locale) return 'en';
	const lower = locale.toLowerCase();
	if (lower === 'zh' || lower.startsWith('zh-') || lower.startsWith('zh_')) {
		return 'zh-cn';
	}
	return 'en';
}

declare global {
	interface Window {
		moment?: {
			locale?: () => string;
		};
	}
}

export function getLocale(): SupportedLocale {
	if (typeof window !== 'undefined') {
		const momentLocale = window.moment?.locale?.();
		if (momentLocale) return normalizeLocale(momentLocale);
	}
	return 'en';
}

export function t(key: TranslationKey): string {
	const locale = getLocale();
	return locales[locale]?.[key] ?? locales.en[key] ?? key;
}

export const translate = t;
