//guide: https://github.com/feathers-studio/telegraf-docs
import express from "express";
import { Telegraf } from "telegraf";

import { setupOrder } from "./bot/orders";
import { setupWallet } from "./bot/wallets";
import { setupBot } from "./bot/utils";
import { BotContext } from "./bot";
const expressApp = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN;
const WEBHOOK_PORT = process.env.WEBHOOK_PORT;
const ENV = process.env.ENV || "local";
if (!BOT_TOKEN || !WEBHOOK_DOMAIN || !WEBHOOK_PORT) {
  throw new Error("Token Or Webook not found");
}
expressApp.use(express.static("static"));
expressApp.use(express.json());
const bot = new Telegraf<BotContext>(BOT_TOKEN);

setupBot(bot)
setupOrder(bot);
setupWallet(bot);

export const startBot = () => {
  ENV === 'local' ? bot.launch() :
    bot.launch({
      webhook: {
        domain: WEBHOOK_DOMAIN,
        port: 3000
      },
    });
};
