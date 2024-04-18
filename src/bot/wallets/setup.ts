import { Telegraf } from "telegraf";
import { BotContext } from "../context";
import { getWalletMenus, listWallets } from "./command";

export const setupWallet = (bot: Telegraf<BotContext>) => {
  bot.command("addwallet", (ctx) => ctx.scene.enter("addWalletWizard"));
  bot.command("deletewallet", (ctx) => ctx.scene.enter("deleteWalletWizard"));
  bot.command("editwallet", (ctx) => ctx.scene.enter("editWalletWizard"));

  //Bot listeners
  bot.hears("🔍 Wallets", getWalletMenus);
  bot.hears("❌ Del wallet", (ctx) => ctx.scene.enter("deleteWalletWizard"));
  bot.hears("✏️ Edit wallet", (ctx) => ctx.scene.enter("editWalletWizard"));
  //Bot Actions
  bot.action("add_wallet", async (ctx) => ctx.scene.enter("addWalletWizard"));
  bot.action("edit_wallet", async (ctx) => ctx.scene.enter("editWalletWizard"));
  bot.action("delete_wallet", async (ctx) =>
    ctx.scene.enter("deleteWalletWizard")
  );
  bot.action("get_my_wallets", listWallets);
  bot.action("show_wallet_menu", getWalletMenus);
};
