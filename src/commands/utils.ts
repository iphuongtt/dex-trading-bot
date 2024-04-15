import { Context, Markup } from "telegraf";

export const getMenus = async (ctx: Context) => {
  return await ctx.reply(
    "Mybestcryptos trading bot",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("🔍 Wallets", "show_wallet_menu"),
        Markup.button.callback("🦄 Trades", "show_trade_menu"),
      ],
      [Markup.button.callback("🧹 Clear histories", "clear_history")],
    ])
  );
};

export const clearHistory = async (ctx: Context) => {
  let i = 0;
  while (true) {
    try {
      if (ctx.message && ctx.message.message_id) {
        await ctx.deleteMessage(ctx.message.message_id - i++);
      } else {
        break;
      }
    } catch (e) {
      break;
    }
  }
};

export const backToMainMenu = async (ctx: Context) => {
  await ctx.deleteMessage();
  return await ctx.reply(
    "Mybestcryptos trading bot",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("🔍 Wallets", "show_wallet_menu"),
        Markup.button.callback("🦄 Trades", "show_trade_menu"),
      ],
      [Markup.button.callback("🧹 Clear histories", "clear_history")],
    ])
  );
};
