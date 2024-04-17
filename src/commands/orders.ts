import { Format, Markup, Context } from "telegraf";
import { getDoc, getListDocs } from "../libs/firestore";
import { getAddOrderTemplate } from "../schemas";
import { Order } from '../models'
import moment from "moment";
import numeral from 'numeral'
import _ from 'lodash'
import { Timestamp } from "firebase-admin/firestore";
import { emojs, getExplorer } from "../libs/constants2";
import { MyContext } from "../wizards";

export const listOrders = async (ctx: Context, isRefresh?: boolean) => {
  console.log({ isRefresh })
  if (isRefresh) {
    await ctx.deleteMessage().catch(e => console.log(e))
  }
  const teleUser = ctx.from;
  if (teleUser) {
    // const loadingMsg = await ctx.reply('🧐')
    //Check if user is exist
    const user = await getDoc("users", null, [
      {
        field: "telegram_id",
        operation: "==",
        value: teleUser.id,
      },
    ]);
    if (user) {
      const orders = await getListDocs("orders", [
        { field: "user_id", operation: "==", value: user.id }
      ])
      if (orders && orders.length > 0) {
        const inlineWalletKeyboard = Markup.inlineKeyboard([
          Markup.button.callback(`${emojs.add} Add`, 'add_order'),
          Markup.button.callback(`${emojs.edit} Edit`, 'edit_order'),
          Markup.button.callback(`${emojs.del} Del`, 'delete_order'),
          Markup.button.callback(emojs.refresh, 'refresh_my_orders'),
        ])
        const title = Format.bold('Your orders are:\n')
        const items: any = [Format.fmt`-------------------------------------\n`]
        orders.forEach((item: Order) => {
          console.log({ item })
          const createat = item.create_at
          if (createat instanceof Timestamp) {
            console.log(moment(createat.toDate()).format('LLLL'))
          }
          const strItems = [];
          strItems.push(Format.fmt`${emojs.order} ${_.upperFirst(item.type)} ${numeral(item.amount_in).format('0,0')} ${item.token_in.symbol}/${item.token_out.symbol} id: ${Format.code(item.id || '')}\n🎯 Target price: ${item.target_price}\nStatus: ${item.is_filled ? `${emojs.checked} Filled` : `${emojs.pending} Pending`}\nActive: ${item.is_active ? `${emojs.yes} Yes` : `${emojs.yes} No`}\n`)
          if (item.is_filled) {
            strItems.push(Format.fmt`Transaction: ${Format.link(item.transaction_hash || '', `${getExplorer(item.chain)}/tx/${item.transaction_hash || ''}`)}\n`)
          }
          strItems.push(Format.fmt`-------------------------------------\n`)
          items.push(Format.join(strItems))
        })
        // if (loadingMsg && loadingMsg.message_id) {
        //   await ctx.deleteMessage(loadingMsg.message_id).catch(e => console.log(e))
        // }
        await ctx.reply(Format.join([title, ...items]), inlineWalletKeyboard)
      } else {
        // if (loadingMsg && loadingMsg.message_id) {
        //   await ctx.deleteMessage(loadingMsg.message_id).catch(e => console.log(e))
        // }
        await ctx.reply(`You don't have any order`)
      }
    } else {
      // if (loadingMsg && loadingMsg.message_id) {
      //   await ctx.deleteMessage(loadingMsg.message_id).catch(e => console.log(e))
      // }
      await ctx.reply('User not found')
    }
  } else {
    await ctx.reply('User not found')
  }
}


export const getTemplate = async (ctx: Context) => {
  const keyboards = Markup.inlineKeyboard([
    Markup.button.callback('Add order', 'get_template_add_order'),
  ])
  await ctx.reply("Select tempalte for: ", keyboards);
}

export const getTemplateAddOrder = async (ctx: Context) => {
  await ctx.reply(Format.code(getAddOrderTemplate()));
}

export const getOrderMenus = async (ctx: Context) => {
  await ctx.deleteMessage().catch(e => console.log(e));
  return await ctx.reply(`${emojs.order} Order menu`, Markup.inlineKeyboard([
    [Markup.button.callback('💼 My orders', 'get_my_orders'), Markup.button.callback('➕ Get template', 'get_template')],
    [Markup.button.callback(`${emojs.add} Add order`, 'add_order'), Markup.button.callback('✏️ Edit order', 'edit_order')],
    [Markup.button.callback(`${emojs.del} Del order`, 'delete_order'), Markup.button.callback('🔙 Back', 'back_to_main_menu')]
  ]))
}


export const editOrder = async (ctx: Context) => {
  await ctx.deleteMessage().catch(e => console.log(e));
  return await ctx.reply('🦄 Which would you like to edit?', Markup.inlineKeyboard([
    [Markup.button.callback('Change target price', 'change_target_price')],
    [Markup.button.callback('Change amount', 'change_order_amount')],
    [Markup.button.callback('Active or Deactive', 'change_order_status')],
    [Markup.button.callback('🔙 Cancel', 'back_to_order_menu')]
  ]))
}
