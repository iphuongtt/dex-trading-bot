import { Context, Markup } from "telegraf"

export const getMenus = async (ctx: Context) => {
  return await ctx.reply('Mybestcryptos trading bot', Markup.keyboard([
    ["🔍 Wallets", "🦄 Trades"], // Row1 with 2 buttons
    ["🧹 Clear histories"]
  ])
    .oneTime()
    .resize(),
  )
}

export const clearHistory = async (ctx: Context) => {
  let i = 0;
  while (true) {
    try {
      if (ctx.message && ctx.message.message_id) {
        await ctx.deleteMessage(ctx.message.message_id - i++);
      } else {
        break
      }
    } catch (e) {
      break;
    }
  }
}
