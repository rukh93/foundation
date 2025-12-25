import { registerAs } from '@nestjs/config';

export type LanguageConfig = {
	language: {
		languages: string[];
		fallback: string;
	};
};

export default registerAs('language', () => ({
	languages: ['en-US'],
	fallback: 'en-US',
}));
