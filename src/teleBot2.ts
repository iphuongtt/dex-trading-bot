//guide: https://github.com/feathers-studio/telegraf-docs
import { ChainId } from "@uniswap/sdk-core";
import express from "express";
import { Composer, Markup, Scenes, session, Telegraf, Format, Context } from "telegraf";

import { MyContext, addTradeWizard, addWalletWizard, deleteWalletWizard, editWalletWizard } from "./wizards";
import { getWalletMenus, listWallets } from "./commands/wallets";
import { getTemplate, getTemplateAddTrade, getTradeMenus, listTrades } from "./commands";
import { clearHistory, getMenus } from "./commands/utils";
const expressApp = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN;
const WEBHOOK_PORT = process.env.WEBHOOK_PORT;
const ENV = process.env.ENV || "local";
if (!BOT_TOKEN) {
  throw new Error("aaa");
}
// if (!BOT_TOKEN || !WEBHOOK_DOMAIN || !WEBHOOK_PORT) {
//     throw new Error('aaa')
// }
expressApp.use(express.static("static"));
expressApp.use(express.json());



// specify generic type of Telegraf context
// thus Typescript will know that ctx.scene exists
const bot = new Telegraf<MyContext>(BOT_TOKEN);

// you can also pass step handlers as Composer
// and attach any methods you need
const stepHandler = new Composer<MyContext>();

const removeKeyboard = Markup.removeKeyboard();

stepHandler.command("next", async (ctx) => {
  await ctx.reply("Step 2. Via command");
  return ctx.wizard.next();
});


const stage = new Scenes.Stage<MyContext>([addTradeWizard, addWalletWizard, deleteWalletWizard, editWalletWizard]);

bot.use(session());
// this attaches ctx.scene to the global context
bot.use(stage.middleware());

bot.command("addtrade", (ctx) => ctx.scene.enter("addTrade"));
bot.command("addwallet", (ctx) => ctx.scene.enter("addWalletWizard"))
bot.command("deletewallet", (ctx) => ctx.scene.enter("deleteWalletWizard"))
bot.command("editwallet", (ctx) => ctx.scene.enter("editWalletWizard"))
bot.command("start", (ctx) => ctx.reply("👍"));
//Bot commands
bot.command('menu', getMenus)

//Bot listeners
bot.hears("🔍 Wallets", getWalletMenus);
bot.hears("❌ Del wallet", (ctx) => ctx.scene.enter("deleteWalletWizard"))
bot.hears("✏️ Edit wallet", (ctx) => ctx.scene.enter("editWalletWizard"))
bot.hears("🔙 Back to Menu", getMenus)
bot.hears("🦄 Trades", getTradeMenus)
bot.hears("🧹 Clear histories", clearHistory)
//Bot Actions
bot.action('add_wallet', async (ctx) => ctx.scene.enter('addWalletWizard'))
bot.action('edit_wallet', async (ctx) => ctx.scene.enter('editWalletWizard'))
bot.action('delete_wallet', async (ctx) => ctx.scene.enter('deleteWalletWizard'))
bot.action('add_trade', async (ctx) => ctx.scene.enter('addTradeWizard'))
bot.action('edit_trade', async (ctx) => ctx.scene.enter('editTradeWizard'))
bot.action('delete_trade', async (ctx) => ctx.scene.enter('deleteTradeWizard'))
bot.action('get_my_wallets', listWallets)
bot.action('get_my_trades', listTrades)
bot.action("get_template", getTemplate)
bot.action("get_template_add_trade", getTemplateAddTrade)
bot.action("back_to_main_menu", async (ctx) => {
  // await ctx.editMessageReplyMarkup(
  //   {
  //     inline_keyboard: [
  //       []
  //     ]
  //   }
  // )
  await ctx.deleteMessage()
  return await ctx.reply('Mybestcryptos trading bot', Markup.keyboard([
    ["🔍 Wallets", "🦄 Trades"], // Row1 with 2 buttons
    ["🧹 Clear histories"]
  ])
    .oneTime()
    .resize(),
  )
})

//Bot starting
const commands = [
  { command: "/start", description: "Start using Mybestcryptos trading bot" },
  { command: "/menu", description: "Menu" }
];
bot.telegram.setMyCommands(commands);
export const startBot = () => {
  bot.launch();
};
