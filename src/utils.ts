import { CallbackQueryContext, CommandContext, HearsContext, InlineQueryContext } from "https://deno.land/x/grammy@v1.32.0/context.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { CustomContext, LinkConverter } from "./types/types.ts";
import { SimpleLinkConverter } from "./converters/simple.ts";
import { APIbasedLinkConverter } from "./converters/music.ts";

export function findMatchingConverter(url: URL, simple_converters: SimpleLinkConverter[], api_converters: APIbasedLinkConverter[]): LinkConverter | null {
	console.debug(`Searching a converter for ${url.origin} …`);

	for (const api_converter of api_converters)
		if (api_converter.isSupported(url)) {
			console.debug(`Found ${api_converter.name}!`);
			return api_converter;
		}
	console.debug(`Didn't find a matching API-based converter. :(`);

	for (const simple_converter of simple_converters)
		if (simple_converter.isSupported(url)) {
			console.debug(`Found ${simple_converter.name}!`);
			return simple_converter;
		}
	console.debug(`Didn't find a matching simple link converter. :(`);

	return null;
}

export async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    // Fetch the HTML content of the URL
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);

    // Get the text content
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    
    // Extract title
    const title = doc?.querySelector("title")?.textContent;
    return title;
  } catch (error) {
    console.error("Error fetching page title:", error);
    return null;
  }
}

export function getExpeditorDebugString(ctx: CommandContext<CustomContext> | HearsContext<CustomContext> | InlineQueryContext<CustomContext> | CallbackQueryContext<CustomContext>): string {
	return `${ctx.from?.first_name}${ctx.config.isDeveloper ? " [Developer]" : ""} (@${ctx.from?.username + " / "}${ctx.from?.id})`;
}

export function getQueryDebugString(ctx: CommandContext<CustomContext> | HearsContext<CustomContext> | InlineQueryContext<CustomContext>): string | RegExpMatchArray {
	return ctx.match.length < 1 ? "(nothing)" : ctx.match;
}
