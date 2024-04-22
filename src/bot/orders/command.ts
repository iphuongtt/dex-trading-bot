import { Context, Format, Markup } from "telegraf";
import { getDoc, getListDocs } from "../../libs/firestore";
import { emojs, getExplorer } from "../../libs/constants2";
import { Order } from "./model";
import { Timestamp } from "firebase-admin/firestore";
import moment from "moment";
import numeral from "numeral";
import { getAddOrderTemplate } from "./schema";
import _ from "lodash";
import { BotContext } from "../context";
import { deleteLastMessage, deleteMessage, deleteMessages, getCurrentMessageId } from "../util";

export const btnShowOrderMenus = Markup.inlineKeyboard([
  Markup.button.callback(`${emojs.back} Back`, 'show_order_menu')
]);

export const listOrders = async (ctx: Context, isRefresh?: boolean) => {
  await deleteLastMessage(ctx)
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
          const createat = item.create_at
          if (createat instanceof Timestamp) {
            console.log(moment(createat.toDate()).format('LLLL'))
          }
          const strItems = [];
          strItems.push(Format.fmt`${emojs.order} ${_.upperFirst(item.type)} ${numeral(item.amount_in).format('0,0')} ${item.token_in.symbol}/${item.token_out.symbol} id: ${Format.code(item.id || '')}\n🎯 Target price: ${item.target_price}\nStatus: ${item.is_filled ? `${emojs.checked} Filled` : `${emojs.pending} Pending`}\nActive: ${item.is_active ? `${emojs.yes} Yes` : `${emojs.no} No`}\n`)
          if (item.is_filled) {
            strItems.push(Format.fmt`Transaction: ${Format.link(item.transaction_hash || '', `${getExplorer(item.chain)}/tx/${item.transaction_hash || ''}`)}\n`)
          }
          strItems.push(Format.fmt`-------------------------------------\n`)
          items.push(Format.join(strItems))
        })
        await ctx.reply(Format.join([title, ...items]), inlineWalletKeyboard)
      } else {
        await ctx.reply(`You don't have any order`, btnShowOrderMenus)
      }
    } else {
      await ctx.reply('User not found', btnShowOrderMenus)
    }
  } else {
    await ctx.reply('User not found', btnShowOrderMenus)
  }
}


export const getTemplate = async (ctx: Context) => {
  const keyboards = Markup.inlineKeyboard([
    Markup.button.callback('Add order', 'get_template_add_order'),
  ])
  await ctx.reply("Select tempalte for: ", keyboards);
}

export const getTemplateAddOrder = async (ctx: BotContext) => {
  deleteLastMessage(ctx)
  return ctx.reply(Format.code(getAddOrderTemplate()), Markup.inlineKeyboard([
    Markup.button.callback(`${emojs.back} Back`, 'show_order_menu')
  ]));
}

const _getOrderMenus = (ctx: Context) => {
  return ctx.reply(`${emojs.order} Order menu`, Markup.inlineKeyboard([
    [Markup.button.callback(`${emojs.order} My orders`, 'get_my_orders'), Markup.button.callback(`${emojs.template} Get template`, 'get_template')],
    [Markup.button.callback(`${emojs.add} Add order`, 'add_order'), Markup.button.callback(`${emojs.edit} Edit order`, 'edit_order')],
    [Markup.button.callback(`${emojs.del} Del order`, 'delete_order'), Markup.button.callback(`${emojs.back} Back`, 'back_to_main_menu')]
  ]))
}

export const getOrderMenus = async (ctx: Context) => {
  await deleteLastMessage(ctx);
  return _getOrderMenus(ctx)
}

export const showOrderMenus = async (ctx: Context) => {
  return _getOrderMenus(ctx)
};

const _getEditOrderMenus = (ctx: Context) => {
  return ctx.reply('🦄 Which would you like to edit?', Markup.inlineKeyboard([
    [Markup.button.callback('Change target price', 'change_target_price')],
    [Markup.button.callback('Change amount', 'change_order_amount')],
    [Markup.button.callback('Active or Deactive', 'change_order_status')],
    [Markup.button.callback('🔙 Cancel', 'back_to_order_menu')]
  ]))
}

export const editOrder = async (ctx: Context) => {
  await deleteLastMessage(ctx);
  return _getEditOrderMenus(ctx)
}

export const showEditOrderMenus = async (ctx: Context) => {
  return _getEditOrderMenus(ctx)
};






/**
 * Delete current message and next number message in delNumberNext param
 * @param ctx
 * @param delNumberNext
 * @returns
 */
export const leaveSceneOrder = async (ctx: BotContext, delNumberNext?: number) => {
  const msgId = getCurrentMessageId(ctx)
  if (msgId) {
    if (delNumberNext && delNumberNext > 0) {
      await deleteMessages(ctx, msgId, delNumberNext)
    } else {
      await deleteMessage(ctx, msgId)
    }
  }
  ctx.scene.reset()
  await ctx.scene.leave()
  return showOrderMenus(ctx)
}

export const leaveSceneOrderStep0 = async (ctx: BotContext) => {
  return leaveSceneOrder(ctx, 0)
}

export const leaveSceneOrderStep1 = async (ctx: BotContext) => {
  return leaveSceneOrder(ctx, 1)
}

export const leaveSceneOrderStep2 = async (ctx: BotContext) => {
  return leaveSceneOrder(ctx, 2)
}

export const leaveSceneOrderStep3 = async (ctx: BotContext) => {
  return leaveSceneOrder(ctx, 3)
}







export const leaveSceneEditOrder = async (ctx: BotContext, delNumberNext?: number) => {
  const msgId = getCurrentMessageId(ctx)
  if (msgId) {
    if (delNumberNext && delNumberNext > 0) {
      await deleteMessages(ctx, msgId, delNumberNext)
    } else {
      await deleteMessage(ctx, msgId)
    }
  }
  ctx.scene.reset()
  await ctx.scene.leave()
  return _getEditOrderMenus(ctx)
}

export const leaveSceneEditOrderStep0 = async (ctx: BotContext) => {
  return leaveSceneEditOrder(ctx, 0)
}

export const leaveSceneEditOrderStep1 = async (ctx: BotContext) => {
  return leaveSceneEditOrder(ctx, 1)
}