import { Context, Format, Markup } from "telegraf";
import { create, getDoc, getListDocs, getServerTimeStamp, incrementNumericValue } from "../../libs/firestore";
import { emojs, getExplorer } from "../../libs/constants2";
import { Timestamp } from "firebase-admin/firestore";
import moment from "moment";
import numeral from "numeral";
import { getAddOrderTemplate } from "./schema";
import _ from "lodash";
import { BotContext } from "../context";
import { deleteLastMessage, deleteMessage, deleteMessages, getCurrentMessageId, isVIP } from "../util";
import { Order } from "../../models";
import { removeUndefined } from "../../libs";

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
          Markup.button.callback(`${emojs.add} Add 2`, 'add_2_order'),
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
          strItems.push(Format.fmt`${emojs.order} ${_.upperFirst(item.type)} ${numeral(item.base_token).format('0,0')} ${item.base_token.symbol}/${item.quote_token.symbol} id: ${Format.code(item.id || '')}\n🎯 Target price: ${item.target_price}\nStatus: ${item.is_filled ? `${emojs.checked} Filled` : `${emojs.pending} Pending`}\nActive: ${item.is_active ? `${emojs.yes} Yes` : `${emojs.no} No`}\n`)
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
    [Markup.button.callback(`${emojs.add} Add order 2`, 'add_2_order')],
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


export const confirmAddOrder = async (ctx: BotContext) => {
  const teleUser = ctx.from
  if (!teleUser) {
    await ctx.reply('User not found')
    return ctx.scene.leave()
  }
  const user: any = await getDoc('users', null, [
    { field: 'telegram_id', operation: '==', value: teleUser.id }
  ])
  if (!user) {
    await ctx.reply('User not found')
    return ctx.scene.leave()
  }
  if (!isVIP(user) && user.count_orders > 0) {
    await ctx.reply(`${emojs.error} You can create maximum 1 order. Please upgrade to VIP account`);
    return ctx.scene.leave();
  }
  //Check if the wallet address has been configured with the corresponding private key or not.
  const walletAddress = ctx.scene.session.addOrderWallet.toLowerCase()
  const wallet = await getDoc('wallets', null, [
    { field: 'wallet', operation: '==', value: walletAddress },
    { field: 'telegram_id', operation: '==', value: teleUser.id }
  ])
  if (!wallet) {
    await ctx.reply('Wallet not found')
    return ctx.scene.leave()
  }
  if (!ctx.scene.session.addChain || !ctx.scene.session.orderType || !ctx.scene.session.baseTokenData || !ctx.scene.session.quoteTokenData) {
    await ctx.reply('Unknow error')
    return ctx.scene.leave()
  }
  const newOrder: Order = {
    chain: ctx.scene.session.addChain,
    type: ctx.scene.session.orderType,
    base_token: { ...ctx.scene.session.baseTokenData },
    quote_token: { ...ctx.scene.session.quoteTokenData },
    amount: ctx.scene.session.baseTokenAmount,
    target_price: ctx.scene.session.targetPrice,
    wallet: walletAddress,
    wallet_id: wallet.id,
    user_id: user.id,
    telegram_id: teleUser.id,
    create_at: getServerTimeStamp(),
    is_filled: false,
    is_active: true,
    transaction_hash: null
  };

  console.log({ newOrder })
  const result = await create(
    "orders",
    null,
    removeUndefined(newOrder)
  );
  if (result) {
    await incrementNumericValue("users", user.id, "count_orders")
    await ctx.reply(Format.fmt`Order added`);
  } else {
    await ctx.reply(Format.fmt`Order add error`);
  }
  return ctx.scene.leave()
}
