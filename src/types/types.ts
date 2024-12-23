import { Context } from "grammy";

export type LinkConfiguration = { name: string; origins: string[]; destination: string; enabled?: boolean };
export type APIConfiguration = {
	name: string;
	enabled: boolean;
	api_key?: string;
	base_url?: string;
};
export type FeaturesConfiguration = { link_recognition: boolean };
export type AboutConfiguration = { code_repo: string; owner: number; status_updates?: { chat: number; topic?: number } };

export type Configuration = {
	links: LinkConfiguration[];
	apis: APIConfiguration[];
	features: FeaturesConfiguration;
	about: AboutConfiguration;
};

export enum APIs {
	ODESLI = "Odesli",
}

export interface BotConfig {
	botDeveloper: number;
	isDeveloper: boolean;
}

export type CustomContext = Context & { config: BotConfig };

export interface LinkConverter {
	readonly name: string;
	readonly origins: URL[];
	readonly destination: URL;
	enabled: boolean;

	isSupported(link: URL): boolean;
	convertLink(link: URL): URL | Promise<URL | null> | null;
	parseLink(link: URL): Promise<[URL, string] | null>;
}
