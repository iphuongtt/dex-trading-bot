import { Format, Markup, Context } from "telegraf";
import { getDoc, getListDocs } from "../libs/firestore";
import { getAddTradeTemplate } from "../schemas";

export const listTrades = async (ctx: Context) => {
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
      const trades = await getListDocs("trades", [
        { field: "user_id", operation: "==", value: user.id }
      ])
      if (trades && trades.length > 0) {
        const inlineWalletKeyboard = Markup.inlineKeyboard([
          Markup.button.callback('➕ Add trade', 'add_trade'),
          Markup.button.callback('✏️ Edit trade', 'edit_trade'),
          Markup.button.callback('❌ Del trade', 'delete_trade'),
          Markup.button.callback('💠 Get template', 'get_template'),
        ])
        const title = Format.bold('Your trades are:\n')
        const items: any = [Format.fmt`-------------------------------------\n`]
        trades.forEach(item => {
          items.push(Format.fmt`
          chain: ${Format.code(item.chain)}\n
          wallet: ${Format.code(item.wallet)}\n
          type: ${Format.code(item.type)}\n
          target_price: ${Format.code(item.target_price)}\n
          is_filled: ${Format.code(item.is_filled)}\n
          transaction_hash: ${Format.code(item.transaction_hash)}\n
          token_in: {\n
            address: ${Format.code(item.token_in.address)}\n
            decimals: ${Format.code(item.token_in.decimals)}\n
            symbol: ${Format.code(item.token_in.symbol)}\n
            name: ${Format.code(item.token_in.name)}\n
          }\n
          token_out: {\n
            address: ${Format.code(item.token_out.address)}\n
            decimals: ${Format.code(item.token_out.decimals)}\n
            symbol: ${Format.code(item.token_out.symbol)}\n
            name: ${Format.code(item.token_out.name)}\n
          }\n
          amount_in: ${Format.code(item.amount_in || '')}\n
          create_at: ${Format.code(item.amount_in || '')}\n
          -------------------------------------\n
        `)
        })
        await ctx.reply(Format.join([title, ...items]), inlineWalletKeyboard)
      } else {
        await ctx.reply(`You don't have any trade`)
      }
    } else {
      await ctx.reply('User not found')
    }
  } else {
    await ctx.reply('User not found')
  }
}


export const getTemplate = async (ctx: Context) => {
  const keyboards = Markup.inlineKeyboard([
    Markup.button.callback('Add trade', 'get_template_add_trade'),
  ])
  await ctx.reply("Select tempalte for: ", keyboards);
}

export const getTemplateAddTrade = async (ctx: Context) => {
  await ctx.reply(Format.code(getAddTradeTemplate()));
}

export const getTradeMenus = async (ctx: Context) => {
  return await ctx.reply('🦄 Trade menu', Markup.inlineKeyboard([
    [Markup.button.callback('💼 My trades', 'get_my_trades'), Markup.button.callback('➕ Get template', 'get_template')],
    [Markup.button.callback('➕ Add trade', 'add_trade'), Markup.button.callback('✏️ Edit trade', 'edit_trade')],
    [Markup.button.callback('❌ Del trade', 'delete_trade'), Markup.button.callback('🔙 Back', 'back_to_main_menu')]
  ]))
}
