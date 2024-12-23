import { LinkConverter } from "../types/types.ts";
import { fetchPageTitle } from "../utils.ts";

export class SimpleLinkConverter implements LinkConverter {
	readonly name: string;
	readonly origins: URL[];
	readonly destination: URL;
	enabled: boolean = true;

	/**
	 * Creates a WebLinkMap object representing a mapping between links for a website.
	 * @param name Friendly name of the website.
	 * @param origins Original URLs that will be converted.
	 * @param destination Destination URLs for conversions.
	 * @param enabled Toggles the website's support in functions or not.
	 */
	constructor(name: string, origins: URL[], destination: URL, enabled?: boolean) {
		this.name = name;
		this.origins = origins;
		this.destination = destination;
		this.enabled = enabled != undefined ? enabled : true;
		console.debug(
			`Created ${this.name} ${SimpleLinkConverter.name} object that converts to ${this.destination.hostname} from ${this.origins.map((origin: URL): string => origin.hostname)}. It is ${this.enabled ? "enabled" : "disabled"}.`,
		);
	}

	/**
	 * Checks if a given link can be handled by this map.
	 * @param link The link to check support for.
	 * @returns True if the link can be handled by this map.
	 */
	public isSupported(link: URL): boolean {
		if (link.hostname === this.destination.hostname) return true;
		for (const origin of this.origins) if (link.hostname.endsWith(origin.hostname)) return true;
		return false;
	}

	/**
	 * filterOutSubdomains
	 * @param link The link to remove subdomains from.
	 * @returns The link with subdomains removed.
	 */
	public static filterOutSubdomains(link: URL): URL {
		// if (!this.enabled) throw new Error("Map is disabled.");
		console.debug(`Filtering out subdomains of link ${link} …`);
		const filteredUrl: URL = new URL(link);
		const hostnameParts: string[] = filteredUrl.hostname.split(".");
		filteredUrl.hostname = hostnameParts[hostnameParts.length - 2] + "." + hostnameParts[hostnameParts.length - 1];
		console.debug(`Filtered out subdomains of link : ${link} -> ${filteredUrl}`);
		return filteredUrl;
	}

	/**
	 * Fetches and expands a given link to the destination website.
	 * @param link The link to expand.
	 * @returns The expanded link.
	 */
	public static async expandLink(link: URL): Promise<URL> {
		console.debug(`Expanding link ${link} …`);
		const response: Response = await fetch(link);
		const expandedUrl: URL = new URL(response.url);
		response.body?.cancel();
		console.debug(`Expanded link : ${link} -> ${expandedUrl}`);
		return expandedUrl;
	}

	/**
	 * Removes search params from link.
	 * @param link The link to clean.
	 * @returns The cleaned link.
	 */
	public static cleanLink(link: URL): URL {
		console.debug(`Cleaning link ${link} …`);
		const linkCleaned = new URL(link.origin + link.pathname);
		console.debug(`Cleaned link : ${link} -> ${linkCleaned}`);
		return linkCleaned;
	}

	/**
	 * Converts a given link to the destination website, removing query parameters if necessary.
	 * @param link - The link to convert.
	 * @returns The converted link without query parameters.
	 * @throws Error if the link is unsupported or conversion is not needed.
	 */
	public convertLink(link: URL): URL | Promise<URL | null> | null {
		if (this.isSupported(link)) {
			console.debug(`Converting link from ${link} to point to ${this.destination} …`);
			const linkConverted = new URL(link);
			linkConverted.protocol = this.destination.protocol;
			linkConverted.hostname = this.destination.hostname;
			linkConverted.port = this.destination.port;
			console.debug(`Converted link : ${link} -> ${linkConverted}`);
			return linkConverted;
		} else throw Error("Unsupported link");
	}

	/**
	 * Parse a given link.
	 * @param link Link to convert.
	 * @returns Converted link.
	 */
	public async parseLink(link: URL): Promise<[URL, string] | null> {
		if (!this.enabled) throw new Error("Map is disabled.");

		const link: URL = await this.convertLink(SimpleLinkConverter.cleanLink(SimpleLinkConverter.filterOutSubdomains(await SimpleLinkConverter.expandLink(link))));
  const title: string = await fetchPageTitle(link)

		return [link, title]
	}
}
