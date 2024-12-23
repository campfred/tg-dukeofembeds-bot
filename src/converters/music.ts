import { OdesliResponse } from "../types/odesli.ts";
import { LinkConverter } from "../types/types.ts";
import { SimpleLinkConverter } from "./simple.ts";

export interface APIbasedLinkConverter extends LinkConverter {
	readonly base_url: URL;
	readonly api_key: string;
}

export class OdesliMusicConverter extends SimpleLinkConverter implements APIbasedLinkConverter {
	readonly base_url: URL = new URL("/v1-alpha.1/links", "https://api.song.link");
	readonly api_key: string = "";

	constructor(name: string, origins: URL[], destination: URL, enabled?: boolean, base_url?: URL, api_key?: string) {
		super(name, origins, destination, enabled ? enabled : true);
		if (api_key !== undefined) this.api_key = api_key;
		if (base_url !== undefined) this.base_url = new URL(base_url);
	}

	/**
	 * Converts a given link to the destination website, removing query parameters if necessary.
	 * @param link - The link to convert.
	 * @returns The converted link without query parameters.
	 * @throws Error if the link is unsupported or conversion is not needed.
	 */
	public override async convertLink(link: URL): Promise<URL | null> {
		const request_url: URL = new URL(this.base_url);
		request_url.searchParams.append("songIfSingle", "true");
		request_url.searchParams.append("url", encodeURI(SimpleLinkConverter.cleanLink(link).toString()));
		console.debug(`Sending request to ${request_url} …`);

		try {
			const response: OdesliResponse = await (await fetch(request_url.toString())).json();
			console.debug("Received response from API!");
			console.debug("Response contains a page's URL : ", "pageUrl" in response);
			const new_url: URL = new URL(response.pageUrl);
			console.debug("Converted music link : ", new_url.toString());
			return new_url;
		} catch (error) {
			console.error(error);
			console.error(`Error with ${this.name} API, maybe the link doesn't belong to a known song.`);
		}
		return null;
	}

	/**
	 * Parse a given link.
	 * @param link Link to convert.
	 * @returns Converted link.
	 */
	public override async parseLink(link: URL): Promise<URL | null> {
		if (!this.enabled) throw new Error("Map is disabled.");

		const link: URL = await this.convertLink(SimpleLinkConverter.cleanLink(await SimpleLinkConverter.expandLink(link)));
  const title: string = await fetchPageTitle(link)

		return [link, title]
	}
}
