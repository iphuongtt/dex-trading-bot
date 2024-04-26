import { Format, Markup, Scenes, Telegraf } from "telegraf";
import { BotContext, cancelBtn, yesOrNoInlineKeyboard } from "../context";
import _ from 'lodash'
import { isValidAddOrder } from "./schema";
import { create, deleteDoc, getDoc, getListDocs, getServerTimeStamp, incrementNumericValue, isExists, updateDoc } from "../../libs/firestore";
import { isNumeric, removeUndefined } from "../../libs";
import { emojs, getExplorer } from "../../libs/constants2";
import { deleteLastMessage, getChain, getRoute, getTokenInfo, isVIP } from "../util";
import { confirmAddOrder, leaveSceneEditOrderStep0, leaveSceneOrderStep0 } from "./command";
import { OrderActions, OrderActionsName } from "./types";
import { isAddress } from "ethers-new";
import numeral from "numeral";
import { ChainId, Token } from "@uniswap/sdk-core";
import { Order, Token as TokenModel, Wallet } from '../../models'
import { supportedChains } from "../../types";

const addOrderWizard = new Scenes.WizardScene<BotContext>(
  "addOrderWizard",
  async (ctx) => {
    await deleteLastMessage(ctx);
    await ctx.reply("Please enter the order data", cancelBtn);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      try {
        const orderData = JSON.parse(ctx.message.text);
        if (isValidAddOrder(orderData)) {
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
          const walletAddress = _.get(orderData, 'wallet', null).toLowerCase()
          const wallet = await getDoc('wallets', null, [
            { field: 'wallet', operation: '==', value: walletAddress },
            { field: 'telegram_id', operation: '==', value: teleUser.id }
          ])
          if (!wallet) {
            await ctx.reply('Wallet not found')
            return ctx.scene.leave()
          }
          const newOrder: Order = {
            ...orderData,
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
            await ctx.reply(Format.fmt`Order added`);
          } else {
            await ctx.reply(Format.fmt`Order add error`);
          }
          return ctx.scene.leave()
        } else {
          await ctx.reply(Format.fmt`The data is not in the correct JSON format`);
          return ctx.scene.leave()
        }
      } catch (error) {
        await ctx.reply(Format.fmt`The data is not in the correct JSON format`);
        return ctx.scene.leave()
      }
    } else {
      ctx.scene.leave();
    }
  }
);

const getTemplateWizard = new Scenes.WizardScene<BotContext>(
  "getTemplateWizard",
  async (ctx) => {
    await deleteLastMessage(ctx);
    const keyboards = Markup.inlineKeyboard([
      [Markup.button.callback('Add order', 'get_template_add_order')],
      [Markup.button.callback(`${emojs.cancel} Cancel`, "leave")],
    ])
    await ctx.reply("Select tempalte for: ", keyboards);
    return ctx.scene.leave()
  }
);

const editOrderPriceWizard = new Scenes.WizardScene<BotContext>(
  'editOrderPriceWizard', // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx);
    await ctx.reply(
      "Please enter the order ID that you want to edit",
      cancelBtn
    );
    ctx.scene.session.idOrderToEdit = ''
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      const order = await getDoc('orders', ctx.message.text)
      if (order) {
        if (_.get(order, 'is_filled', false)) {
          await ctx.reply(Format.fmt`Order can not edit`);
          return ctx.scene.leave()
        } else {
          ctx.scene.session.idOrderToEdit = ctx.message.text
        }
      } else {
        await ctx.reply(Format.fmt`Order not found`);
        return ctx.scene.leave()
      }
    } else {
      return ctx.wizard.next();
    }
    await ctx.reply(Format.fmt`Enter new target price for ${Format.code('address')}`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    console.log(ctx.message)
    if (ctx.message && "text" in ctx.message && ctx.message.text && isNumeric(ctx.message.text)) {
      await updateDoc("orders", ctx.scene.session.idOrderToEdit, { target_price: ctx.message.text })
      await ctx.reply(Format.fmt`Order id ${Format.code(ctx.scene.session.idOrderToEdit)} updated`);
    } else {
      await ctx.reply('Cancel')
    }
    return ctx.scene.leave();
  },
);

const editOrderAmountWizard = new Scenes.WizardScene<BotContext>(
  'editOrderAmountWizard', // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx);
    await ctx.reply(
      "Please enter the order ID that you want to edit",
      cancelBtn
    );
    ctx.scene.session.idOrderToEdit = ''
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      const order = await getDoc('orders', ctx.message.text)
      if (order) {
        if (_.get(order, 'is_filled', false)) {
          await ctx.reply(Format.fmt`Order can not edit`);
          return ctx.scene.leave()
        } else {
          ctx.scene.session.idOrderToEdit = ctx.message.text
        }
      } else {
        await ctx.reply(Format.fmt`Order not found`);
        return ctx.scene.leave()
      }
    } else {
      return ctx.wizard.next();
    }
    await ctx.reply(Format.fmt`Enter new amount in for ${Format.code('address')}`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text && isNumeric(ctx.message.text)) {
      await updateDoc("orders", ctx.scene.session.idOrderToEdit, { amount_in: ctx.message.text })
      await ctx.reply(Format.fmt`Order id ${Format.code(ctx.scene.session.idOrderToEdit)} updated`);
    } else {
      await ctx.reply('Cancel')
    }
    return ctx.scene.leave();
  },
);

const editOrderStatusWizard = new Scenes.WizardScene<BotContext>(
  'editOrderStatusWizard', // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx);
    await ctx.reply(
      "Please enter the order ID that you want to edit",
      cancelBtn
    );
    ctx.scene.session.idOrderToEdit = ''
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      const order = await getDoc('orders', ctx.message.text)
      if (order) {
        if (_.get(order, 'is_filled', false)) {
          await ctx.reply(Format.fmt`Order can not edit`);
          return ctx.scene.leave()
        } else {
          ctx.scene.session.idOrderToEdit = ctx.message.text
        }
      } else {
        await ctx.reply(Format.fmt`Order not found`);
        return ctx.scene.leave()
      }
    } else {
      return ctx.wizard.next();
    }
    await ctx.reply(Format.fmt`Enter new status for ${Format.code(ctx.message.text)}:\n1: Active\n0: Deactive`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text && isNumeric(ctx.message.text) && (parseInt(ctx.message.text) === 0 || parseInt(ctx.message.text) === 1)) {
      await updateDoc("orders", ctx.scene.session.idOrderToEdit, { is_active: parseInt(ctx.message.text) === 1 ? true : false })
      await ctx.reply(Format.fmt`Order id ${Format.code(ctx.scene.session.idOrderToEdit)} updated`);
    } else {
      await ctx.reply('Cancel')
    }
    return ctx.scene.leave();
  },
);


const deleteOrderWizard = new Scenes.WizardScene<BotContext>(
  'deleteOrderWizard', // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx);
    await ctx.reply(
      "Please enter the order ID that you want to delete",
      cancelBtn
    );
    ctx.scene.session.idOrderToDelete = ''
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      const isOrderExist = await isExists('orders', ctx.message.text)
      if (isOrderExist) {
        ctx.scene.session.idOrderToDelete = ctx.message.text
      }
    } else {
      return ctx.wizard.next();
    }
    await ctx.reply(Format.fmt`Are you sure to delete the order?`, Markup.inlineKeyboard([
      Markup.button.callback(`${emojs.yes} Yes`, "confirm_delete"),
      Markup.button.callback(`${emojs.no} No`, "not_confirm_delete")
    ]));
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      if (ctx.message.text === 'Yes') {
        await deleteDoc("orders", ctx.scene.session.idOrderToDelete)
        await ctx.reply(Format.fmt`Order id ${Format.code(ctx.scene.session.idOrderToDelete)} deleted`, Markup.removeKeyboard());
      } else {
        await ctx.reply('Cancel', Markup.removeKeyboard())
      }
    } else {
      await ctx.reply('Cancel', Markup.removeKeyboard())
    }
    return ctx.scene.leave();
  },
);

const selectChainBtn = () => {
  const btns = []
  for (const _chain of supportedChains) {
    btns.push([Markup.button.callback(`${_.toUpper(_chain)}`, `select_chain_${_chain}`)],)
  }
  return Markup.inlineKeyboard(btns)
}

const selectOrderTypeBtn = (pair: string) => {
  return Markup.inlineKeyboard([
    [Markup.button.callback(`${emojs.buy} ${OrderActionsName.select_buy_order} ${pair}`, OrderActions.select_buy_order)],
    [Markup.button.callback(`${emojs.sell} ${OrderActionsName.select_sell_order} ${pair}`, OrderActions.select_sell_order)]
  ])
}

const selectWalletBtn = (wallets: Wallet[]) => {
  const btns = []
  for (let i = 0; i < wallets.length; i++) {
    btns.push([Markup.button.callback(`${emojs.address} ${wallets[i].wallet}`, `select_wallet_${wallets[i].wallet}`)],)
  }
  return Markup.inlineKeyboard(btns)
}

const add2OrderWizard = new Scenes.WizardScene<BotContext>(
  "add2OrderWizard",
  async (ctx) => {
    await deleteLastMessage(ctx);
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
    const wallets = await getListDocs("wallets", [
      { field: "user_id", operation: "==", value: user.id },
    ]);
    if (!wallets || wallets.length < 0) {
      await ctx.reply('Wallet not found')
      return ctx.scene.leave()
    }
    await ctx.reply("Please select the wallet", selectWalletBtn(wallets));
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text && isAddress(ctx.message.text)) {
      const baseTokenData = await getTokenInfo(ctx.scene.session.addChain || 'base', ctx.message.text);
      if (baseTokenData && baseTokenData.symbol && baseTokenData.name && baseTokenData.decimals) {
        ctx.scene.session.baseTokenAddress = ctx.message.text
        ctx.scene.session.baseTokenData = baseTokenData//new Token(ctx.scene.session.addChainId, ctx.message.text, baseTokenData.decimals, baseTokenData.symbol, baseTokenData.name)
        await ctx.reply("Please enter the quote token address (Base/Quote)");
        return ctx.wizard.next();
      } else {
        await ctx.reply(`${emojs.error} Token address ${ctx.message.text} not found`);
      }
    } else {
      await ctx.reply(`${emojs.error} The token address is not in a valid format`);
    }
    return ctx.scene.leave()
  },

  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text && isAddress(ctx.message.text)) {
      const quoteTokenData = await getTokenInfo(ctx.scene.session.addChain || 'base', ctx.message.text);
      if (quoteTokenData && quoteTokenData.symbol && quoteTokenData.name && quoteTokenData.decimals) {
        ctx.scene.session.quoteTokenAddress = ctx.message.text
        ctx.scene.session.quoteTokenData = quoteTokenData//new Token(ctx.scene.session.addChainId, ctx.message.text, quoteTokenData.decimals, quoteTokenData.symbol, quoteTokenData.name)
        await ctx.reply(`${emojs.loading} Getting the route for swapping ${ctx.scene.session.baseTokenData.symbol} <-> ${ctx.scene.session.quoteTokenData.symbol}. Please wait...`)
        const route = await getRoute(ctx.scene.session.baseTokenData, ctx.scene.session.quoteTokenData, 'base')
        if (route) {
          ctx.scene.session.routePath = route.path
          ctx.scene.session.currentPrice = route.price
          await ctx.reply(`Route found: ${route.path}`)
          await ctx.reply("Please select order Type", selectOrderTypeBtn(`${ctx.scene.session.baseTokenData.symbol}/${ctx.scene.session.quoteTokenData.symbol}`));
          return ctx.wizard.next();
        } else {
          await ctx.reply(`${emojs.error} Route not found`);
        }
      } else {
        await ctx.reply(`${emojs.error} Token address ${ctx.message.text} not found`);
      }
    } else {
      await ctx.reply(`${emojs.error} The token address is not in a valid format`);
    }
    return ctx.scene.leave()
  },

  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text && isNumeric(ctx.message.text)) {
      ctx.scene.session.baseTokenAmount = parseFloat(ctx.message.text)
      await ctx.reply(Format.fmt`Please enter the target price at which you want to ${ctx.scene.session.orderType} ${ctx.scene.session.baseTokenData.symbol}/${ctx.scene.session.quoteTokenData.symbol}? Current price is: ${Format.code(ctx.scene.session.currentPrice.toString())}`);
      return ctx.wizard.next();
    } else {
      await ctx.reply(`${emojs.error} Token amount is not a valid number`);
    }
    return ctx.scene.leave()
  },

  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text && isNumeric(ctx.message.text)) {
      ctx.scene.session.targetPrice = parseFloat(ctx.message.text)
      const estQuoteAmount = ctx.scene.session.baseTokenAmount * ctx.scene.session.targetPrice
      // console.log(ctx.scene.session)
      const strItems = [
        Format.bold('Are you sure you want to create the order?\n'),
        Format.fmt`${emojs.network} Network: ${ctx.scene.session.addChain ? ctx.scene.session.addChain.toUpperCase() : ''}\n`,
        Format.fmt`${emojs.address} Wallet: ${Format.link(ctx.scene.session.addOrderWallet, `${getExplorer(ctx.scene.session.addChain || 'base')}/address/${ctx.scene.session.addOrderWallet}`)}\n`,
        Format.fmt`${emojs.route} Route: ${ctx.scene.session.routePath}\n`,
        Format.fmt`${emojs.order} To ${ctx.scene.session.orderType} ${numeral(ctx.scene.session.baseTokenAmount).format('0,0')} ${Format.link(ctx.scene.session.baseTokenData.symbol || '', `${getExplorer(ctx.scene.session.addChain || 'base')}/token/${ctx.scene.session.baseTokenData.address || ''}`)} ${ctx.scene.session.orderType === 'buy' ? 'with' : 'for'} ${Format.link(ctx.scene.session.quoteTokenData.symbol || '', `${getExplorer(ctx.scene.session.addChain || 'base')}/token/${ctx.scene.session.quoteTokenData.address || ''}`)}\n`,
        Format.fmt`${emojs.target} Current price ${Format.link(ctx.scene.session.baseTokenData.symbol || '', `${getExplorer(ctx.scene.session.addChain || 'base')}/token/${ctx.scene.session.baseTokenData.address || ''}`)}/${Format.link(ctx.scene.session.quoteTokenData.symbol || '', `${getExplorer(ctx.scene.session.addChain || 'base')}/token/${ctx.scene.session.quoteTokenData.address || ''}`)}: ${Format.code(ctx.scene.session.currentPrice.toString())}\n`,
        Format.fmt`${emojs.target} Target price ${Format.link(ctx.scene.session.baseTokenData.symbol || '', `${getExplorer(ctx.scene.session.addChain || 'base')}/token/${ctx.scene.session.baseTokenData.address || ''}`)}/${Format.link(ctx.scene.session.quoteTokenData.symbol || '', `${getExplorer(ctx.scene.session.addChain || 'base')}/token/${ctx.scene.session.quoteTokenData.address || ''}`)}: ${Format.code(ctx.scene.session.targetPrice)}\n`,
      ];
      if (ctx.scene.session.orderType === 'buy') {
        strItems.push(Format.fmt`${emojs.target} Expected cost: ${Format.code(estQuoteAmount)} ${ctx.scene.session.quoteTokenData.symbol || ''}`)
      } else if (ctx.scene.session.orderType === 'sell') {
        strItems.push(Format.fmt`${emojs.target} Expected to receive: ${Format.code(estQuoteAmount)} ${ctx.scene.session.quoteTokenData.symbol || ''}`)
      }
      await ctx.reply(Format.join(strItems), yesOrNoInlineKeyboard);
      return ctx.wizard.next();
    } else {
      await ctx.reply(`${emojs.error} Target price is not a valid number`);
    }
    return ctx.scene.leave()
  },

);

const add3OrderWizard = new Scenes.BaseScene<BotContext>('add3OrderWizard')
add3OrderWizard.enter((ctx) => {
  ctx.scene.session.addChain = null
  return ctx.reply("Please select chain", selectChainBtn());
});

add2OrderWizard.action(/select_wallet_[a-zA-Z0-9]+/, async (ctx) => {
  const _math = ctx.match[0]
  const _wallet = _.replace(_math, 'select_wallet_', '')
  ctx.scene.session.addOrderWallet = _wallet
  await ctx.reply("Please select chain", selectChainBtn());
})

add2OrderWizard.action(/select_chain_[a-z]+/, async (ctx) => {
  const _math = ctx.match[0]
  const _chain = _.replace(_math, 'select_chain_', '')
  const chainInfo = getChain(_chain)
  if (chainInfo) {
    ctx.scene.session.addChain = chainInfo.chain
    ctx.scene.session.addChainId = chainInfo.chainId
    return ctx.reply("Please enter the base token address (Base/Quote)");
  } else {
    await ctx.reply(`The chain ${_chain} is not supported`);
    ctx.scene.leave()
  }
})

add2OrderWizard.action(OrderActions.select_buy_order, async (ctx: BotContext) => {
  ctx.scene.session.orderType = 'buy'
  return ctx.reply(`Please enter the amount of ${ctx.scene.session.baseTokenData.symbol} you want to buy:`);
})

add2OrderWizard.action(OrderActions.select_sell_order, async (ctx: BotContext) => {
  ctx.scene.session.orderType = 'sell'
  return ctx.reply(`Please enter the amount of ${ctx.scene.session.baseTokenData.symbol} you want to sell:`);
})

add2OrderWizard.action('yes', confirmAddOrder)
add2OrderWizard.action('no', async (ctx: BotContext) => {
  ctx.scene.reset()
  await ctx.reply("Canceled");
  ctx.scene.leave()
})











deleteOrderWizard.action("leave", async (ctx) => {
  let msgId = null
  if (ctx.callbackQuery.message?.message_id) {
    msgId = ctx.callbackQuery.message?.message_id
  }
  if (msgId) {
    ctx.deleteMessage(ctx.callbackQuery.message?.message_id)
  }
  ctx.scene.reset()
  return await ctx.scene.leave()
})

deleteOrderWizard.action("confirm_delete", async (ctx) => {
  let msgId = null
  if (ctx.callbackQuery.message?.message_id) {
    msgId = ctx.callbackQuery.message?.message_id
  }
  if (msgId) {
    ctx.deleteMessage(ctx.callbackQuery.message?.message_id)
  }
  ctx.scene.reset()
  return await ctx.scene.leave()
})

deleteOrderWizard.action("not_confirm_delete", async (ctx) => {
  let msgId = null
  if (ctx.callbackQuery.message?.message_id) {
    msgId = ctx.callbackQuery.message?.message_id
  }
  if (msgId) {
    ctx.deleteMessage(ctx.callbackQuery.message?.message_id)
  }
  ctx.scene.reset()
  return await ctx.scene.leave()
})


export const setupOrderWizards = (bot: Telegraf<BotContext>) => {
  bot.action('add_order', async (ctx) => ctx.scene.enter('addOrderWizard'))
  bot.action('delete_order', async (ctx) => ctx.scene.enter('deleteOrderWizard'))
}

addOrderWizard.action("leave", leaveSceneOrderStep0)
getTemplateWizard.action("leave", leaveSceneOrderStep0)
editOrderPriceWizard.action("leave", leaveSceneEditOrderStep0)
editOrderAmountWizard.action("leave", leaveSceneEditOrderStep0)
editOrderStatusWizard.action("leave", leaveSceneEditOrderStep0)
deleteOrderWizard.action("leave", leaveSceneOrderStep0)

export const orderScenes = [
  addOrderWizard,
  getTemplateWizard,
  editOrderPriceWizard,
  editOrderAmountWizard,
  editOrderStatusWizard,
  deleteOrderWizard,
  add2OrderWizard,
  add3OrderWizard
]
