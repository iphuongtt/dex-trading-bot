import { Telegraf } from "telegraf";
import { BotContext } from "../context";
import { getWalletMenus, listWLWallets, listWallets, viewDetailWallet } from "./command";
import _ from "lodash";

export const setupWallet = (bot: Telegraf<BotContext>) => {
  // bot.command("addwallet", (ctx) => ctx.scene.enter("addWalletWizard"));
  bot.command("deletewallet", (ctx) => ctx.scene.enter("deleteWalletWizard"));
  bot.command("editwallet", (ctx) => ctx.scene.enter("editWalletWizard"));

  //Bot listeners
  bot.hears("🔍 Wallets", getWalletMenus);
  bot.hears("❌ Del wallet", (ctx) => ctx.scene.enter("deleteWalletWizard"));
  bot.hears("✏️ Edit wallet", (ctx) => ctx.scene.enter("editWalletWizard"));
  bot.command(/view_wl_[a-zA-Z0-9]+/, async (ctx) => {
    const _math = ctx.match[0];
    const _walletId = _.replace(_math, "view_wl_", "");
    return viewDetailWallet(ctx, _walletId)
  });
  bot.command(/edit_wl_[a-zA-Z0-9]+/, async (ctx) => {
    const _math = ctx.match[0];
    const _walletId = _.replace(_math, "edit_wl_", "");
    return ctx.scene.enter("editCurrentWalletWizard", { idWalletToEdit: _walletId })
  });
  bot.command(/delete_wl_[a-zA-Z0-9]+/, async (ctx) => {
    const _math = ctx.match[0];
    const _walletId = _.replace(_math, "delete_wl_", "");
    return ctx.scene.enter("deleteCurrentWalletWizard", { idWalletToDelete: _walletId })
  });
  bot.command(/edit_wlwl_[a-zA-Z0-9]+/, async (ctx) => {
    const _math = ctx.match[0];
    const _walletId = _.replace(_math, "edit_wlwl_", "");
    console.log(_walletId)
    return ctx.scene.enter("editWLWalletWizard", { idWLWalletToEdit: _walletId })
  });
  bot.command(/delete_wlwl_[a-zA-Z0-9]+/, async (ctx) => {
    const _math = ctx.match[0];
    const _walletId = _.replace(_math, "delete_wlwl_", "");
    return ctx.scene.enter("deleteWLWalletWizard", { idWLWalletToDelete: _walletId })
  });

  //Bot Actions
  // bot.action("add_wallet", async (ctx) => ctx.scene.enter("addWalletWizard"));
  bot.action("edit_wallet", async (ctx) => ctx.scene.enter("editWalletWizard"));
  bot.action("delete_wallet", async (ctx) =>
    ctx.scene.enter("deleteWalletWizard")
  );
  bot.action("get_my_wallets", listWallets);
  bot.action("get_my_wl_wallets", listWLWallets);
  bot.action("show_wallet_menu", getWalletMenus);
  bot.action("create_wallet", async (ctx) => ctx.scene.enter("createWalletWizard"));
  bot.action("transfer_token", async (ctx) => ctx.scene.enter("transferWizard"));
};
