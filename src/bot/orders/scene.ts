import { Format, Markup, Scenes, Telegraf } from "telegraf";
import { BotContext, cancelBtn, yesOrNoInlineKeyboard } from "../context";
import _ from "lodash";
import { isValidAddOrder } from "./schema";
import {
  create,
  deleteDoc,
  getDoc,
  getListDocs,
  getServerTimeStamp,
  incrementNumericValue,
  isExists,
  updateDoc,
} from "../../libs/firestore";
import { getDAIAddr, getUSDCAddr, getUSDTAddr, getWETHAddr, isNumeric, removeUndefined } from "../../libs";
import { emojs } from "../../libs/constants2";
import {
  deleteLastMessage,
  deleteLastMessages,
  deleteMessage,
  genAddressLink,
  genChainLink,
  genTokenLink,
  getChain,
  getRoute,
  getTokenInfo,
  isVIP,
  reply,
} from "../util";
import {
  activeOrder,
  cancleAndClose,
  confirmAddOrder,
  deActiveOrder,
  deleteOrder,
  leaveSceneOrderStep0,
} from "./command";
import { OrderActions, OrderActionsName } from "./types";
import { isAddress } from "ethers-new";
import { Order, Wallet } from "../../models";
import {
  supportedChains

} from "../../types";

const addOrderWizard = new Scenes.WizardScene<BotContext>(
  "addOrderWizard",
  async (ctx) => {
    await deleteLastMessage(ctx);
    await reply(ctx, "Please enter the order data", cancelBtn);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      try {
        const orderData = JSON.parse(ctx.message.text);
        if (isValidAddOrder(orderData)) {
          const teleUser = ctx.from;
          if (!teleUser) {
            await reply(ctx, "User not found");
            return ctx.scene.leave();
          }
          const user: any = await getDoc("users", null, [
            { field: "telegram_id", operation: "==", value: teleUser.id },
          ]);
          if (!user) {
            await reply(ctx, "User not found");
            return ctx.scene.leave();
          }
          if (!isVIP(user) && user.count_orders > 0) {
            await reply(ctx,
              `${emojs.error} You can create maximum 1 order. Please upgrade to VIP account`
            );
            return ctx.scene.leave();
          }
          //Check if the wallet address has been configured with the corresponding private key or not.
          const walletAddress = _.get(orderData, "wallet", null).toLowerCase();
          const wallet = await getDoc("wallets", null, [
            { field: "wallet", operation: "==", value: walletAddress },
            { field: "telegram_id", operation: "==", value: teleUser.id },
          ]);
          if (!wallet) {
            await reply(ctx, "Wallet not found");
            return ctx.scene.leave();
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
            transaction_hash: null,
          };
          const result = await create(
            "orders",
            null,
            removeUndefined(newOrder)
          );
          if (result) {
            await incrementNumericValue("users", user.id, "count_orders");
            await reply(ctx, Format.fmt`Order added`);
          } else {
            await reply(ctx, Format.fmt`Order add error`);
          }
          return ctx.scene.leave();
        } else {
          await reply(ctx,
            Format.fmt`The data is not in the correct JSON format`
          );
          return ctx.scene.leave();
        }
      } catch (error) {
        await reply(ctx, Format.fmt`The data is not in the correct JSON format`);
        return ctx.scene.leave();
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
      [Markup.button.callback("Add order", "get_template_add_order")],
      [Markup.button.callback(`${emojs.cancel} Cancel`, "leave")],
    ]);
    await reply(ctx, "Select tempalte for: ", keyboards);
    return ctx.scene.leave();
  }
);

const editOrderPriceWizard = new Scenes.WizardScene<BotContext>(
  "editOrderPriceWizard", // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx)
    if (ctx.scene.session.state && "idOrderToEdit" in ctx.scene.session.state && ctx.scene.session.state.idOrderToEdit && _.isString(ctx.scene.session.state.idOrderToEdit)) {
      const order: any = await getDoc("orders", ctx.scene.session.state.idOrderToEdit);
      if (order) {
        if (_.get(order, "is_filled", false)) {
          await reply(ctx, Format.fmt`Order filled, so you can't edit.`);
          return ctx.scene.leave();
        } else {
          ctx.scene.session.idOrderToEdit = ctx.scene.session.state.idOrderToEdit;
          await reply(ctx,
            Format.fmt`Enter new target price:`,
            cancelBtn
          );
          return ctx.wizard.next();
        }
      } else {
        await reply(ctx, Format.fmt`Order not found`);
        return ctx.scene.leave();
      }
    } else {
      return ctx.wizard.next();
    }
  },
  async (ctx) => {
    console.log(ctx.message);
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text &&
      isNumeric(ctx.message.text)
    ) {
      await updateDoc("orders", ctx.scene.session.idOrderToEdit, {
        target_price: ctx.message.text,
      });
      await reply(ctx,
        Format.fmt`Order id ${Format.code(
          ctx.scene.session.idOrderToEdit
        )} updated`
      );
    } else {
      await reply(ctx, "Cancel");
    }
    return ctx.scene.leave();
  }
);

const editOrderAmountWizard = new Scenes.WizardScene<BotContext>(
  "editOrderAmountWizard", // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx)
    if (ctx.scene.session.state && "idOrderToEdit" in ctx.scene.session.state && ctx.scene.session.state.idOrderToEdit && _.isString(ctx.scene.session.state.idOrderToEdit)) {
      const order: any = await getDoc("orders", ctx.scene.session.state.idOrderToEdit);
      if (order) {
        if (_.get(order, "is_filled", false)) {
          await reply(ctx, Format.fmt`Order filled, so you can't edit.`);
          return ctx.scene.leave();
        } else {
          ctx.scene.session.idOrderToEdit = ctx.scene.session.state.idOrderToEdit;
          await reply(ctx,
            Format.fmt`Enter new amount:`,
            cancelBtn
          );
          return ctx.wizard.next();
        }
      } else {
        await reply(ctx, Format.fmt`Order not found`);
        return ctx.scene.leave();
      }
    } else {
      return ctx.wizard.next();
    }
  },

  async (ctx) => {
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text &&
      isNumeric(ctx.message.text)
    ) {
      await updateDoc("orders", ctx.scene.session.idOrderToEdit, {
        amount_in: ctx.message.text,
      });
      await reply(ctx,
        Format.fmt`Order id ${Format.code(
          ctx.scene.session.idOrderToEdit
        )} updated`
      );
    } else {
      await reply(ctx, "Cancel");
    }
    return ctx.scene.leave();
  }
);

const editOrderStatusWizard = new Scenes.WizardScene<BotContext>(
  "editOrderStatusWizard", // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx)
    if (ctx.scene.session.state && "idOrderToEdit" in ctx.scene.session.state && ctx.scene.session.state.idOrderToEdit && _.isString(ctx.scene.session.state.idOrderToEdit)) {
      const order: any = await getDoc("orders", ctx.scene.session.state.idOrderToEdit);
      if (order) {
        if (_.get(order, "is_filled", false)) {
          await reply(ctx, Format.fmt`Order filled, so you can't edit.`);
          return ctx.scene.leave();
        } else {
          ctx.scene.session.idOrderToEdit = ctx.scene.session.state.idOrderToEdit;
          await reply(ctx,
            Format.fmt`Select new status`,
            Markup.inlineKeyboard([
              [Markup.button.callback(`${emojs.yes} Active`, "active_order"), Markup.button.callback(`${emojs.no} Deactive`, "deactive_order")],
              [Markup.button.callback(`${emojs.cancel} Cancel`, "leave")]
            ]
            ))
          return ctx.wizard.next();
        }
      } else {
        await reply(ctx, Format.fmt`Order not found`);
        return ctx.scene.leave();
      }
    } else {
      return ctx.wizard.next();
    }
  }
);


const deleteOrderWizard = new Scenes.WizardScene<BotContext>(
  "deleteOrderWizard", // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx)
    if (ctx.scene.session.state && "idOrderToDelete" in ctx.scene.session.state && ctx.scene.session.state.idOrderToDelete && _.isString(ctx.scene.session.state.idOrderToDelete)) {
      const _order: any = await getDoc("orders", ctx.scene.session.state.idOrderToDelete)
      if (_order) {
        ctx.scene.session.idOrderToDelete = ctx.scene.session.state.idOrderToDelete;
        await reply(ctx,
          Format.fmt`Are you sure to delete order?`,
          yesOrNoInlineKeyboard
        );
        return ctx.wizard.next();
      } else {
        await reply(ctx, 'Order not found')
        return ctx.scene.leave()
      }
    } else {
      return ctx.wizard.next();
    }
  }
);



const selectChainBtn = (selected?: string | null) => {
  const btns = [];
  const isSelected = selected ? true : false
  for (const _chain of supportedChains) {
    btns.push([
      Markup.button.callback(`${selected && selected === _chain ? emojs.checked : ''} ${_.toUpper(_chain)}`, `${isSelected ? 'no_action' : `select_chain_${_chain}`}`),
    ]);
  }
  btns.push([
    Markup.button.callback(`${emojs.cancel} Cancel`, 'cancel'),
  ]);
  return Markup.inlineKeyboard(btns);
};

const showSelected = async (selected: string, ctx: BotContext) => {
  await deleteLastMessage(ctx)
  return reply(ctx, `${emojs.checked} ${selected}`)
};

const selectOrderTypeBtn = (pair: string) => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        `${emojs.buy} ${OrderActionsName.select_buy_order} ${pair}`,
        OrderActions.select_buy_order
      ),
    ],
    [
      Markup.button.callback(
        `${emojs.sell} ${OrderActionsName.select_sell_order} ${pair}`,
        OrderActions.select_sell_order
      ),
    ],
    [Markup.button.callback(`${emojs.cancel} Cancel`, 'cancel')]
  ]);
};

const selectWalletBtn = (wallets: Wallet[]) => {
  const btns = [];
  for (let i = 0; i < wallets.length; i++) {
    btns.push([
      Markup.button.callback(
        `${emojs.address} ${wallets[i].name.toUpperCase()} - ${wallets[i].wallet}`,
        `select_wallet_${wallets[i].wallet}`
      ),
    ]);
  }
  btns.push([
    Markup.button.callback(`${emojs.cancel} Cancel`, 'cancel'),
  ]);
  return Markup.inlineKeyboard(btns);
};

const add2OrderWizard = new Scenes.WizardScene<BotContext>(
  "add2OrderWizard",
  async (ctx) => {
    await deleteLastMessage(ctx);
    await reply(ctx, `${emojs.order} Add new order:`);
    await reply(ctx, "Please select chain", selectChainBtn());
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.scene.session.addChain) {
      return ctx.scene.leave()
    }
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text) {
      const baseTokenData = await getTokenInfo(
        ctx.scene.session.addChain,
        ctx.message.text
      );
      if (
        baseTokenData &&
        baseTokenData.symbol &&
        baseTokenData.name &&
        baseTokenData.decimals
      ) {
        ctx.scene.session.baseTokenAddress = ctx.message.text;
        ctx.scene.session.baseTokenData = baseTokenData;
        await deleteLastMessages(ctx, 2)
        await reply(ctx, Format.fmt`${emojs.checked} Base token: ${genTokenLink(baseTokenData.symbol, ctx.scene.session.addChain, ctx.scene.session.baseTokenAddress)}`)
        await reply(ctx,
          Format.fmt`Please enter the quote token address (Base/Quote) or /WETH, /USDC, /USDT, /DAI`, Markup.inlineKeyboard([Markup.button.callback(`${emojs.cancel} Cancel`, 'cancel')])
        );
        return ctx.wizard.next();
      } else {
        await reply(ctx,
          `${emojs.error} Token address ${ctx.message.text} not found`
        );
      }
    } else {
      await reply(ctx,
        `${emojs.error} The token address is not in a valid format`
      );
    }
    return ctx.scene.leave();
  },

  async (ctx) => {
    if (!ctx.scene.session.addChain) {
      return ctx.scene.leave();
    }
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      let quoteTokenAddr = null;
      if (ctx.message.text.toUpperCase() === "/WETH" || ctx.message.text.toUpperCase() === "WETH") {
        quoteTokenAddr = getWETHAddr(ctx.scene.session.addChainId);
      } else if (ctx.message.text.toUpperCase() === "USDT" || ctx.message.text.toUpperCase() === "/USDT") {
        quoteTokenAddr = getUSDTAddr(ctx.scene.session.addChainId);
      } else if (ctx.message.text.toUpperCase() === "USDC" || ctx.message.text.toUpperCase() === "/USDC") {
        quoteTokenAddr = getUSDCAddr(ctx.scene.session.addChainId);
      } else if (ctx.message.text.toUpperCase() === "DAI" || ctx.message.text.toUpperCase() === "/DAI") {
        quoteTokenAddr = getDAIAddr(ctx.scene.session.addChainId);
      }
      else if (isAddress(ctx.message.text)) {
        quoteTokenAddr = ctx.message.text;
      }
      if (quoteTokenAddr) {
        const quoteTokenData = await getTokenInfo(
          ctx.scene.session.addChain,
          quoteTokenAddr
        );
        if (
          quoteTokenData &&
          quoteTokenData.symbol &&
          quoteTokenData.name &&
          quoteTokenData.decimals
        ) {
          ctx.scene.session.quoteTokenAddress = quoteTokenAddr;
          ctx.scene.session.quoteTokenData = quoteTokenData; //new Token(ctx.scene.session.addChainId, quoteTokenAddr, quoteTokenData.decimals, quoteTokenData.symbol, quoteTokenData.name)
          await deleteLastMessages(ctx, 2)
          await reply(ctx, Format.fmt`${emojs.checked} Quote token: ${genTokenLink(quoteTokenData.symbol, ctx.scene.session.addChain, ctx.scene.session.quoteTokenAddress)}`)
          const lastMsg = await reply(ctx,
            `${emojs.loading} Getting the route for swapping ${ctx.scene.session.baseTokenData.symbol} <-> ${ctx.scene.session.quoteTokenData.symbol}. Please wait...`);
          const route = await getRoute(
            ctx.scene.session.baseTokenData,
            ctx.scene.session.quoteTokenData,
            ctx.scene.session.addChain
          );
          if (route) {
            ctx.scene.session.routePath = route.path;
            ctx.scene.session.currentPrice = route.price;
            if (lastMsg) {
              await deleteMessage(ctx, lastMsg.message_id)
            }
            await reply(ctx, `${emojs.checked} Route: ${route.path}`);
            await reply(ctx,
              "Please select order Type",
              selectOrderTypeBtn(
                `${ctx.scene.session.baseTokenData.symbol}/${ctx.scene.session.quoteTokenData.symbol}`
              )
            );
            return ctx.wizard.next();
          } else {
            await reply(ctx, `${emojs.error} Route not found`);
          }
        } else {
          await reply(ctx,
            `${emojs.error} Token address ${quoteTokenAddr} not found`
          );
        }
      } else {
        await reply(ctx,
          `${emojs.error} Token address ${quoteTokenAddr} not found`
        );
      }
    } else {
      await reply(ctx,
        `${emojs.error} The token address is not in a valid format`
      );
    }
    return ctx.scene.leave();
  },

  async (ctx) => {
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text &&
      isNumeric(ctx.message.text)
    ) {
      ctx.scene.session.baseTokenAmount = parseFloat(ctx.message.text);
      await deleteLastMessages(ctx, 2)
      await reply(ctx, `${emojs.checked} Amount: ${ctx.scene.session.baseTokenAmount}`)
      await reply(ctx,
        Format.fmt`Please enter the target price at which you want to ${ctx.scene.session.orderType
          } ${ctx.scene.session.baseTokenData.symbol}/${ctx.scene.session.quoteTokenData.symbol
          }? Current price is: ${Format.code(
            ctx.scene.session.currentPrice.toString()
          )}`, Markup.inlineKeyboard([Markup.button.callback(`${emojs.cancel} Cancel`, 'cancel')])
      );
      return ctx.wizard.next();
    } else {
      await reply(ctx, `${emojs.error} Token amount is not a valid number`);
    }
    return ctx.scene.leave();
  },

  async (ctx) => {
    const _addChain = ctx.scene.session.addChain
    if (!_addChain) {
      return ctx.scene.leave()
    }
    const _baseSymbol = ctx.scene.session.baseTokenData.symbol;
    const _baseAddr = ctx.scene.session.baseTokenData.address;

    const _quoteSymbol = ctx.scene.session.quoteTokenData.symbol;
    const _quoteAddr = ctx.scene.session.quoteTokenData.address;
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text &&
      isNumeric(ctx.message.text)
    ) {
      ctx.scene.session.targetPrice = parseFloat(ctx.message.text);
      await deleteLastMessages(ctx, 2)
      await reply(ctx, `${emojs.checked} Target price: ${ctx.scene.session.targetPrice}`)
      const estQuoteAmount =
        ctx.scene.session.baseTokenAmount * ctx.scene.session.targetPrice;
      // console.log(ctx.scene.session)
      const strItems = [Format.fmt`${emojs.target} Current price ${_baseSymbol}/${_quoteSymbol}: ${Format.code(ctx.scene.session.currentPrice.toString())}\n`];
      if (ctx.scene.session.orderType === "buy") {
        strItems.push(
          Format.fmt`${emojs.target} Expected cost: ${Format.code(
            estQuoteAmount
          )} ${_quoteSymbol}\n`
        );
      } else if (ctx.scene.session.orderType === "sell") {
        strItems.push(
          Format.fmt`${emojs.target} Expected to receive: ${Format.code(
            estQuoteAmount
          )} ${_quoteSymbol}\n`
        );
      }
      strItems.push(Format.fmt`${Format.bold("Are you sure you want to create the order?")}\n`)
      await reply(ctx, Format.join(strItems), yesOrNoInlineKeyboard);
      return ctx.wizard.next();
    } else {
      await reply(ctx, `${emojs.error} Target price is not a valid number`);
    }
    return ctx.scene.leave();
  }
);

add2OrderWizard.action(/select_wallet_[a-zA-Z0-9]+/, async (ctx) => {
  const _math = ctx.match[0];
  const _wallet = _.replace(_math, "select_wallet_", "");
  ctx.scene.session.addOrderWallet = _wallet;
  if (!ctx.scene.session.addChain) {
    await reply(ctx, `The chain is not supported`);
    return ctx.scene.leave();
  }
  const walletLink = genAddressLink(ctx.scene.session.addChain, _wallet)
  await reply(ctx, Format.fmt`${emojs.checked} Wallet: ${walletLink}`)
  let tokenStr = '';
  const tokens = await getListDocs("tokens", [
    { field: "chain", operation: "==", value: ctx.scene.session.addChain }
  ])
  if (tokens) {
    tokens.map((token: any) => {
      tokenStr += ` /${token.symbol}`
    })
  }
  return reply(ctx, `Please enter the base token address (Base/Quote) or select ${tokenStr}`, Markup.inlineKeyboard([Markup.button.callback(`${emojs.cancel} Cancel`, 'cancel')]));
});

add2OrderWizard.action(/select_chain_[a-z_]+/, async (ctx) => {
  const _math = ctx.match[0];
  const _chain = _.replace(_math, "select_chain_", "");
  const chainInfo = getChain(_chain);
  if (chainInfo && _chain) {
    ctx.scene.session.addChain = chainInfo.chain;
    ctx.scene.session.addChainId = chainInfo.chainId;
    await deleteLastMessage(ctx)
    const chainLink = genChainLink(_chain)
    if (chainLink) {
      const teleUser = ctx.from;
      if (!teleUser) {
        await reply(ctx, "User not found");
        return ctx.scene.leave();
      }
      const user: any = await getDoc("users", null, [
        { field: "telegram_id", operation: "==", value: teleUser.id },
      ]);
      if (!user) {
        await reply(ctx, "User not found");
        return ctx.scene.leave();
      }
      const wallets = await getListDocs("wallets", [
        { field: "user_id", operation: "==", value: user.id },
      ]);
      if (!wallets || wallets.length < 0) {
        await reply(ctx, "Wallet not found");
        return ctx.scene.leave();
      }
      await reply(ctx, Format.fmt`${emojs.checked} Chain: ${chainLink}`)
      return reply(ctx, "Please select the wallet", selectWalletBtn(wallets));
    } else {
      await reply(ctx, `The chain ${_chain} is not supported`);
      ctx.scene.leave();
    }
  } else {
    await reply(ctx, `The chain ${_chain} is not supported`);
    ctx.scene.leave();
  }
});

add2OrderWizard.action(
  OrderActions.select_buy_order,
  async (ctx: BotContext) => {
    ctx.scene.session.orderType = "buy";
    if (ctx.scene.session.addChain) {
      await deleteLastMessage(ctx)
      await reply(ctx, Format.fmt`${emojs.checked} Buy ${ctx.scene.session.baseTokenData.symbol} with ${ctx.scene.session.quoteTokenData.symbol}\n`,)
      return reply(ctx,
        `Please enter the amount of ${ctx.scene.session.baseTokenData.symbol} you want to buy:`, Markup.inlineKeyboard([Markup.button.callback(`${emojs.cancel} Cancel`, 'cancel')])
      );
    } else {
      reply(ctx, 'Error')
      return ctx.scene.leave
    }
  }
);

add2OrderWizard.action(
  OrderActions.select_sell_order,
  async (ctx: BotContext) => {
    ctx.scene.session.orderType = "sell";
    if (ctx.scene.session.addChain) {
      await deleteLastMessage(ctx)
      await reply(ctx, Format.fmt`${emojs.checked} Sell ${ctx.scene.session.baseTokenData.symbol} for ${ctx.scene.session.quoteTokenData.symbol}\n`,)
      return reply(ctx,
        `Please enter the amount of ${ctx.scene.session.baseTokenData.symbol} you want to sell:`, Markup.inlineKeyboard([Markup.button.callback(`${emojs.cancel} Cancel`, 'cancel')])
      );
    } else {
      reply(ctx, 'Error')
      return ctx.scene.leave
    }
  }
);

add2OrderWizard.action("yes", confirmAddOrder);
add2OrderWizard.action("no", async (ctx: BotContext) => {
  ctx.scene.reset();
  await reply(ctx, "Canceled the creation of the order.");
  ctx.scene.leave();
});

add2OrderWizard.action("cancel", async (ctx: BotContext) => {
  ctx.scene.reset();
  await reply(ctx, "Canceled the creation of the order.");
  ctx.scene.leave();
});

export const setupOrderWizards = (bot: Telegraf<BotContext>) => {
  bot.action("add_order", async (ctx) => ctx.scene.enter("addOrderWizard"));
  bot.action("delete_order", async (ctx) =>
    ctx.scene.enter("deleteOrderWizard")
  );
};

addOrderWizard.action("leave", leaveSceneOrderStep0);
editOrderPriceWizard.action("leave", cancleAndClose);
editOrderAmountWizard.action("leave", cancleAndClose);
editOrderStatusWizard.action("leave", cancleAndClose);

deleteOrderWizard.action("leave", cancleAndClose);
deleteOrderWizard.action("yes", deleteOrder);
deleteOrderWizard.action("no", cancleAndClose);

editOrderStatusWizard.action("active_order", activeOrder)
editOrderStatusWizard.action("deactive_order", deActiveOrder)
editOrderStatusWizard.action("leave", async (ctx) => {
  await deleteLastMessage(ctx)
  return ctx.scene.leave()
})


export const orderScenes = [
  addOrderWizard,
  getTemplateWizard,
  editOrderPriceWizard,
  editOrderAmountWizard,
  editOrderStatusWizard,
  deleteOrderWizard,
  add2OrderWizard,
];
