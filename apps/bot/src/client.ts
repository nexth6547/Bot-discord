import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from "discord.js";
import prisma from "@bot/database";

export interface Command {
  data: SlashCommandBuilder | any;
  execute: (interaction: ChatInputCommandInteraction, client: BotClient) => Promise<any>;
  autocomplete?: (interaction: AutocompleteInteraction, client: BotClient) => Promise<any>;
}

export class BotClient extends Client {
  public commands: Collection<string, Command> = new Collection();
  public db = prisma;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember,
      ],
    });
  }
}
