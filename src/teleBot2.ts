//guide: https://github.com/feathers-studio/telegraf-docs
import express from "express";
import { Composer, Markup, Scenes, session, Telegraf } from "telegraf";

import { MyContext, addOrderWizard, addWalletWizard, deleteWalletWizard, editOrderAmountWizard, editOrderPriceWizard, editOrderStatusWizard, editWalletWizard } from "./wizards";
import { getWalletMenus, listWallets } from "./commands/wallets";
import { editOrder, getTemplate, getTemplateAddOrder, getOrderMenus, listOrders } from "./commands";
import { backToMainMenu, clearHistory, getMenus } from "./commands/utils";
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
// const removeKeyboard = Markup.removeKeyboard();

stepHandler.command("next", async (ctx) => {
  await ctx.reply("Step 2. Via command");
  return ctx.wizard.next();
});

const stage = new Scenes.Stage<MyContext>([addOrderWizard, addWalletWizard, deleteWalletWizard, editWalletWizard, editOrderPriceWizard,
  editOrderAmountWizard,
  editOrderStatusWizard]);

bot.use(session());
// this attaches ctx.scene to the global context
bot.use(stage.middleware());

bot.command("addorder", (ctx) => ctx.scene.enter("addOrder"));
bot.command("addwallet", (ctx) => ctx.scene.enter("addWalletWizard"))
bot.command("deletewallet", (ctx) => ctx.scene.enter("deleteWalletWizard"))
bot.command("editwallet", (ctx) => ctx.scene.enter("editWalletWizard"))
bot.command("start", (ctx) => ctx.reply("👍"));
bot.command("myorders", async (ctx) => listOrders(ctx, false))
//Bot commands
bot.command('menu', getMenus)
//Bot listeners
bot.hears("🔍 Wallets", getWalletMenus);
bot.hears("❌ Del wallet", (ctx) => ctx.scene.enter("deleteWalletWizard"))
bot.hears("✏️ Edit wallet", (ctx) => ctx.scene.enter("editWalletWizard"))
bot.hears("🔙 Back to Menu", getMenus)
bot.hears("🦄 Orders", getOrderMenus)
bot.hears("🧹 Clear histories", clearHistory)
//Bot Actions
bot.action('add_wallet', async (ctx) => ctx.scene.enter('addWalletWizard'))
bot.action('edit_wallet', async (ctx) => ctx.scene.enter('editWalletWizard'))
bot.action('delete_wallet', async (ctx) => ctx.scene.enter('deleteWalletWizard'))
bot.action('add_order', async (ctx) => ctx.scene.enter('addOrderWizard'))
bot.action('edit_order', editOrder)
bot.action('delete_order', async (ctx) => ctx.scene.enter('deleteOrderWizard'))
bot.action('get_my_wallets', listWallets)
bot.action('get_my_orders', async (ctx) => listOrders(ctx, false))
bot.action('refresh_my_orders', async (ctx) => listOrders(ctx, true))
bot.action("get_template", getTemplate)
bot.action("get_template_add_order", getTemplateAddOrder)
bot.action("show_wallet_menu", getWalletMenus)
bot.action("show_order_menu", getOrderMenus)
bot.action("clear_history", clearHistory)
bot.action("back_to_main_menu", backToMainMenu)
bot.action("back_to_order_menu", getOrderMenus)
bot.action("change_target_price", async (ctx) => ctx.scene.enter('editOrderPriceWizard'))
bot.action("change_order_amount", async (ctx) => ctx.scene.enter('editOrderAmountWizard'))
bot.action("change_order_status", async (ctx) => ctx.scene.enter('editOrderStatusWizard'))

//Bot starting
const commands = [
  { command: "/start", description: "Start using Mybestcryptos trading bot" },
  { command: "/menu", description: "Menu" },
  { command: "/myorders", description: "Get my orders" }
];
bot.telegram.setMyCommands(commands);
export const startBot = () => {
  bot.launch();
};
