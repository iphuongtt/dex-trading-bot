import { Context, Format, Markup } from "telegraf";
import { create, deleteDoc, getDoc, getListDocs, getServerTimeStamp, incrementNumericValue, updateDoc } from "../../libs/firestore";
import { emojs, getExplorer } from "../../libs/constants2";
import { Timestamp } from "firebase-admin/firestore";
import moment from "moment";
import numeral from "numeral";
import { getAddOrderTemplate } from "./schema";
import _ from "lodash";
import { BotContext } from "../context";
import { deleteLastMessage, deleteMessage, deleteMessages, getCurrentMessageId, isVIP, reply } from "../util";
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
          Markup.button.callback(`${emojs.add} Add new`, 'add_2_order'),
          Markup.button.callback(emojs.refresh, 'refresh_my_orders'),
        ])
        const title = Format.bold('Your orders are:\n')
        const items: any = [Format.fmt`-------------------------------------\n`]
        orders.forEach((item: Order) => {
          const createat = item.create_at
          const strItems = [
            Format.fmt`${emojs.order} ${_.upperFirst(item.type)} ${Format.code(numeral(item.amount).format('0,0'))} ${item.base_token.symbol}/${item.quote_token.symbol}\n`,
            Format.fmt`🎯 Target price: ${Format.code(item.target_price)}\n`,
            Format.fmt`Status: ${item.is_filled ? `${emojs.checked} Filled` : `${emojs.pending} Pending`}\n`,
            Format.fmt`Active: ${item.is_active ? `${emojs.yes} Yes` : `${emojs.no} No`}\n`
          ];
          if (createat instanceof Timestamp) {
            strItems.push(Format.fmt`${emojs.date} Create At: ${moment(createat.toDate()).format('LLLL')} (${moment(createat.toDate()).fromNow()})\n`)
          }
          if (item.is_filled) {
            strItems.push(Format.fmt`Transaction: ${Format.link(item.transaction_hash || '', `${getExplorer(item.chain)}/tx/${item.transaction_hash || ''}`)}\n`)
          }
          strItems.push(Format.fmt`${emojs.edit} Change target price: /edit_target_price_ord_${item.id || ''}\n`)
          strItems.push(Format.fmt`${emojs.edit} Change status: /edit_status_ord_${item.id || ''}\n`)
          strItems.push(Format.fmt`${emojs.edit} Change amount: /edit_amount_ord_${item.id || ''}\n`)
          strItems.push(Format.fmt`${emojs.del} Delete: /delete_ord_${item.id || ''}\n`)
          strItems.push(Format.fmt`-------------------------------------\n`)
          items.push(Format.join(strItems))
        })
        await reply(ctx, Format.join([title, ...items]), inlineWalletKeyboard)
      } else {
        await reply(ctx, `You don't have any order`, btnShowOrderMenus)
      }
    } else {
      await reply(ctx, 'User not found', btnShowOrderMenus)
    }
  } else {
    await reply(ctx, 'User not found', btnShowOrderMenus)
  }
}


export const getTemplate = async (ctx: Context) => {
  const keyboards = Markup.inlineKeyboard([
    Markup.button.callback('Add order', 'get_template_add_order'),
  ])
  await reply(ctx, "Select tempalte for: ", keyboards);
}

export const getTemplateAddOrder = async (ctx: BotContext) => {
  deleteLastMessage(ctx)
  return reply(ctx, Format.code(getAddOrderTemplate()), Markup.inlineKeyboard([
    Markup.button.callback(`${emojs.back} Back`, 'show_order_menu')
  ]));
}

const _getOrderMenus = (ctx: Context) => {
  return reply(ctx, `${emojs.order} Order menu`, Markup.inlineKeyboard([
    [Markup.button.callback(`${emojs.order} My orders`, 'get_my_orders'), Markup.button.callback(`${emojs.add} Add order 2`, 'add_2_order')],
    [Markup.button.callback(`${emojs.back} Back`, 'back_to_main_menu')]
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
  return reply(ctx, '🦄 Which would you like to edit?', Markup.inlineKeyboard([
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
    await reply(ctx, 'User not found')
    return ctx.scene.leave()
  }
  const user: any = await getDoc('users', null, [
    { field: 'telegram_id', operation: '==', value: teleUser.id }
  ])
  if (!user) {
    await reply(ctx, 'User not found')
    return ctx.scene.leave()
  }
  if (!isVIP(user) && user.count_orders > 0) {
    await reply(ctx, `${emojs.error} You can create maximum 1 order. Please upgrade to VIP account`);
    return ctx.scene.leave();
  }
  //Check if the wallet address has been configured with the corresponding private key or not.
  const walletAddress = ctx.scene.session.addOrderWallet.toLowerCase()
  const wallet = await getDoc('wallets', null, [
    { field: 'wallet', operation: '==', value: walletAddress },
    { field: 'telegram_id', operation: '==', value: teleUser.id }
  ])
  if (!wallet) {
    await reply(ctx, 'Wallet not found')
    return ctx.scene.leave()
  }
  if (!ctx.scene.session.addChain || !ctx.scene.session.orderType || !ctx.scene.session.baseTokenData || !ctx.scene.session.quoteTokenData) {
    await reply(ctx, 'Unknow error')
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

  const result = await create(
    "orders",
    null,
    removeUndefined(newOrder)
  );
  if (result) {
    await incrementNumericValue("users", user.id, "count_orders")
    await reply(ctx, Format.fmt`Order added`);
  } else {
    await reply(ctx, Format.fmt`Order add error`);
  }
  return ctx.scene.leave()
}

export const activeOrder = async (ctx: BotContext) => {
  await updateDoc("orders", ctx.scene.session.idOrderToEdit, {
    is_active: true
  });
  await reply(ctx,
    Format.fmt`Order id ${Format.code(
      ctx.scene.session.idOrderToEdit
    )} is activated`
  );
}

export const deActiveOrder = async (ctx: BotContext) => {
  await updateDoc("orders", ctx.scene.session.idOrderToEdit, {
    is_active: false
  });
  await reply(ctx,
    Format.fmt`Order id ${Format.code(
      ctx.scene.session.idOrderToEdit
    )} is deactivated`
  );
}

export const deleteOrder = async (ctx: BotContext) => {
  const teleUser = ctx.from;
  if (!teleUser) {
    await reply(ctx, "User not register")
    return ctx.scene.leave();
  }
  deleteLastMessage(ctx)
  const user = await getDoc("users", null, [
    {
      field: "telegram_id",
      operation: "==",
      value: teleUser.id,
    },
  ]);
  if (!user) {
    await reply(ctx, "User not register")
    return ctx.scene.leave();
  }
  await deleteDoc("orders", ctx.scene.session.idOrderToDelete);
  await incrementNumericValue("users", user.id, "count_orders", -1)
  await reply(ctx,
    Format.fmt`Order deleted`
  );
  ctx.scene.reset();
  return await ctx.scene.leave();
};

export const cancleAndClose = async (ctx: BotContext) => {
  await deleteLastMessage(ctx)
  return ctx.scene.leave()
}
