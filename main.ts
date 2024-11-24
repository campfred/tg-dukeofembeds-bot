import "@std/dotenv/load";
import { parse } from "@std/yaml";
import { Bot, CommandContext, Context } from "https://deno.land/x/grammy@v1.32.0/mod.ts";
import { Configuration, BotConfig, WebLinkMap } from "./types.ts";
import { findMatchingMap } from "./utils.ts";

const PATH_CONFIG_FILE = Deno.env.get("PREVIEWSYNTH_CONFIG_FILE_PATH") || "config.yaml";

enum COMMANDS {
	START = "start",
	GET_SUPPORTED_LINKS = "help",
	LINK_CONVERT = "convert",
	LINK_EMBED = "embed",
}

console.debug(`Reading configuration file at ${PATH_CONFIG_FILE} ...`);
const CONFIG: Configuration = parse(await Deno.readTextFile(PATH_CONFIG_FILE));
console.debug(`Reading links configuration...`);
console.debug(CONFIG);
const WEB_LINKS: WebLinkMap[] = CONFIG.links.map((link: { name: string; origins: string[]; destination: string; enabled?: boolean }) => {
	console.debug(`Creating ${WebLinkMap.name} config for ${link.name} ...`);
	return new WebLinkMap(
		link.name,
		link.origins.map((origin: string) => new URL(origin)),
		new URL(link.destination),
		link.enabled,
	);
});
console.info(`Loaded links configuration.`);
console.table(
	WEB_LINKS.map((webLink: WebLinkMap): { name: string; origins: string[]; destination: string; enabled: boolean } => {
		return {
			name: webLink.name,
			origins: webLink.origins.map((origin: URL): string => {
				return origin.origin;
			}),
			destination: webLink.destination.origin,
			enabled: webLink.enabled,
		};
	}),
);
const ABOUT = CONFIG.about;
console.info("Loaded about configuration.");
console.table(ABOUT);

type CustomContext = Context & { config: BotConfig };

function generateFromDebugString(ctx: CommandContext<CustomContext>): string {
	return `${ctx.from?.first_name}${ctx.config.isDeveloper ? " [Developer]" : ""} (@${ctx.from?.username + " / "}${ctx.from?.id})`;
}

// https://grammy.dev/guide/context#transformative-context-flavors
const BOT = new Bot<CustomContext>(Deno.env.get("TELEGRAM_BOT_TOKEN") || "");
BOT.use((ctx, next) => {
	ctx.config = { botDeveloper: CONFIG.about.owner, isDeveloper: ctx.from?.id === CONFIG.about.owner };
	next();
});
BOT.api.setMyCommands([
	{ command: COMMANDS.START, description: "Start the bot." },
	{ command: COMMANDS.GET_SUPPORTED_LINKS, description: "Get a list of supported links." },
	{ command: COMMANDS.LINK_CONVERT, description: "Convert a link." },
]);

/**
 * Healthcheck ping command
 */
BOT.command("ping", (ctx) => {
	console.debug(`Got pinged by ${generateFromDebugString(ctx)}`);
	ctx.react("⚡");
	ctx.reply("Pong! 🏓", { reply_parameters: { message_id: ctx.msg.message_id } });
});

/**
 * Start command
 */
BOT.command(COMMANDS.START, (ctx) => {
	console.debug(`Started session with ${generateFromDebugString(ctx)}`);
	ctx.react("👀");
	let response: string = `Hi! I'm the ${BOT.botInfo.first_name}! A simple bot that serves the purpose of automatically embedding links! 👋`;
	response += "\n";
	response += `\nI can convert links given with the « ${COMMANDS.LINK_CONVERT} » command to become an embed-friendly + tracking-free version. 💛`;
	if (CONFIG.features.link_recognition) response += `\nAlso, if I get added to a group and someone sends a link I recognize, I'll convert it and reply with the converted one automatically. 👀`;
	response += `\n<blockquote>When I convert a link, I also get rid of its parameters (the text after a « ? » in a link). It allows to get rid of tracking IDs for example. 😉</blockquote>`;
	response += "\n";
	response += `\nOf course, if you feel concerned about privacy with me, feel free to check out <a href="${CONFIG.about.code_repo}">my code on GitHub</a>! 🌐`;
	response += `\n<blockquote><b>Please do not</b> interact with bots that you do not understand or trust its handling of your information!</blockquote>`;
	response += "\n";
	response += `\nAnyway, I wish you a nice day! 🎶`;
	ctx.reply(response, { reply_parameters: { message_id: ctx.msg.message_id }, parse_mode: "HTML" });
});

/**
 * Get supported links
 */
BOT.command(COMMANDS.GET_SUPPORTED_LINKS, (ctx) => {
	console.debug(`Help requested from ${generateFromDebugString(ctx)}`);
	let response = `Simply use the « /${COMMANDS.LINK_CONVERT} » command to convert a link to an embed-friendly one. ✨\nOf course, if there's a translation that you know about and would like me to learn, feel free to suggest it as an issue <a href="${ABOUT.code_repo}/issues/new">on GitHub</a>! 🌐\n\nFor info, here's a list of all the links I support and their equivalent :\n<blockquote>`;
	let firstLink: boolean = true;
	for (const webLink of WEB_LINKS) {
		if (webLink.enabled) {
			response += `${firstLink ? "" : "\n"}<b>${webLink.name}</b> : ${webLink.origins.map((origin: URL): string => origin.hostname)} → ${webLink.destination.hostname}`;
			firstLink = false;
		}
	}
	response += "</blockquote>";
	ctx.reply(response, { reply_parameters: { message_id: ctx.msg.message_id }, parse_mode: "HTML" });
});

/**
 * Convert link
 */
BOT.command([COMMANDS.LINK_CONVERT, COMMANDS.LINK_EMBED], async (ctx) => {
	console.debug(`Requested to convert a link by ${generateFromDebugString(ctx)} : ${ctx.match.length < 1 ? "(nothing)" : ctx.match}`);

	// Handle mistakes where no link is given
	if (ctx.match.length < 1) {
		ctx.reply("Oop! No link was given with the command. 😅\nMaybe try again with a link following the command next time?\n<blockquote>Need help to use the command? Check « /help ».</blockquote>", {
			parse_mode: "HTML",
			reply_parameters: { message_id: ctx.msg.message_id },
		});
		return;
	}

	// Check if link matches in map
	ctx.react("🤔");
	const matchingMap: WebLinkMap | null = findMatchingMap(ctx.match, WEB_LINKS);
	if (matchingMap) {
		console.debug("Found the following math : " + matchingMap?.name);
		ctx.react("👀");
		const linkConverted: URL = await matchingMap.parseLink(new URL(ctx.match));
		if (linkConverted.toString() === WebLinkMap.cleanLink(new URL(ctx.match)).toString()) ctx.reply(`Hmm... That link already looks fine to me. 🤔`, { reply_parameters: { message_id: ctx.msg.message_id } });
		else {
			ctx.reply(`Oh I know that! 👀\nIt's a link from ${matchingMap?.name}!\nLemme convert that for you real quick… ✨`, { reply_parameters: { message_id: ctx.msg.message_id } });
			ctx.reply("<i>There you go!</i> 😊\nHopefully @WebpageBot will create an embedded preview soon if it's not already there! ✨", {
				parse_mode: "HTML",
				reply_parameters: { message_id: (await ctx.reply(linkConverted.toString(), { reply_parameters: { message_id: ctx.msg.message_id } })).message_id },
			});
		}
		return;
	} else {
		// Handle when link isn't known in map
		ctx.react("🗿");
		ctx.reply(
			`Sorry, I don't have an equivalent for that website. 😥\n<blockquote>If you happen to know one, feel free to submit a request through <a href="${ABOUT.code_repo}/issues">an Issue on my code's repository</a>. 💛</blockquote>`,
			{
				parse_mode: "HTML",
				reply_parameters: { message_id: ctx.msg.message_id },
			},
		);
	}
});

// for (const webLink of WEB_LINKS) {
// 	BOT.hears(webLink.origin_regex, (ctx: HearsContext<CustomContext>) => {
// 		if (ctx.match instanceof String) webLink.convertLink(ctx.);
// 	});

// 	// BOT.inlineQuery(new RegExp(`/(${ COMMANDS.LINK_CONVERT }|${ COMMANDS.LINK_EMBED })`, "gi"), (ctx) =>
// 	// {
// 	// 	const match = ctx.match
// 	// 	InlineQueryResultBuilder.
// 	// })
// }

Deno.addSignalListener("SIGINT", (): void => {
	BOT.api.sendMessage(CONFIG.about.owner, "Bot shutting down! 💤");
	BOT.stop();
});
if (Deno.build.os == "windows") {
	Deno.addSignalListener("SIGBREAK", (): void => {
		BOT.api.sendMessage(CONFIG.about.owner, "Bot shutting down! 💤");
		BOT.stop();
	});
}
if (Deno.build.os != "windows") {
	Deno.addSignalListener("SIGTERM", (): void => {
		BOT.api.sendMessage(CONFIG.about.owner, "Bot shutting down! 💤");
		BOT.stop();
	});
}

await BOT.start();

BOT.api.sendMessage(CONFIG.about.owner, "Bot now online! 🎉");
