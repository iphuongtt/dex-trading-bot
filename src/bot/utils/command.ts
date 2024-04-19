import { Context, Markup } from "telegraf";
import { emojs } from "../../libs/constants2";

export const getMenus = async (ctx: Context) => {
  return await ctx.reply(
    "Mybestcryptos trading bot",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("🔍 Wallets", "show_wallet_menu"),
        Markup.button.callback("🦄 Orders", "show_order_menu"),
      ],
      [Markup.button.callback("Close menu", "close_menu")],
    ])
  );
};

export const clearHistory = async (ctx: Context) => {
  console.log(ctx.callbackQuery)
  let i = 0;
  let currentMessageId = null;
  if (ctx.message && ctx.message.message_id) {
    currentMessageId = ctx.message.message_id
  } else if (ctx.callbackQuery?.message?.message_id) {
    currentMessageId = ctx.callbackQuery.message.message_id
  }
  console.log({ currentMessageId })
  if (currentMessageId) {
    while (true) {
      try {
        await ctx.deleteMessage(currentMessageId - i++)
      } catch (e) {
        console.log(e)
        break;
      }
    }
  }
};

export const backToMainMenu = async (ctx: Context) => {
  await ctx.deleteMessage().catch(e => console.log(e));
  return await ctx.reply(
    "Mybestcryptos trading bot",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("🔍 Wallets", "show_wallet_menu"),
        Markup.button.callback("🦄 Orders", "show_order_menu"),
      ],
      [Markup.button.callback(`${emojs.close} Close menu`, "close_menu")],
    ])
  );
};
