import { Format, Markup, Context } from "telegraf";
import { getDoc, getListDocs } from "../libs/firestore";

export const listWallets = async (ctx: Context) => {
  const teleUser = ctx.from;
  if (teleUser) {
    //Check if user is exist
    const user = await getDoc("users", null, [
      {
        field: "telegram_id",
        operation: "==",
        value: teleUser.id,
      },
    ]);
    if (user) {
      const wallets = await getListDocs("wallets", [
        { field: "user_id", operation: "==", value: user.id }
      ])
      if (wallets && wallets.length > 0) {
        const title = Format.bold('Your wallets are:\n')
        const items: any = [Format.fmt`-------------------------------------\n`]
        wallets.forEach(item => {
          items.push(Format.fmt`address: ${Format.code(item.wallet)}\nid: ${Format.code(item.id)}\nname: ${Format.code(item.name || '')}\n-------------------------------------\n`)
        })
        await ctx.reply(Format.join([title, ...items]))
      } else {
        await ctx.reply(`You don't have any wallet`)
      }
    } else {
      await ctx.reply('User not found')
    }
  } else {
    await ctx.reply('User not found')
  }
}


export const getWalletMenus = async (ctx: Context) => {
  return await ctx.reply('Wallet menu', Markup.inlineKeyboard([
    Markup.button.callback('💼 My wallets', 'get_my_wallets'),
    Markup.button.callback('➕ Add wallet', 'add_wallet'),
    Markup.button.callback('✏️ Edit wallet', 'edit_wallet'),
    Markup.button.callback('❌ Del wallet', 'delete_wallet')
  ]))
}
