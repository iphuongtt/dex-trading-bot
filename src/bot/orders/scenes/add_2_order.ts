import { Format, Markup, Scenes } from "telegraf";
import { BotContext, yesOrNoInlineKeyboard } from "../../context";
import { deleteLastMessage, deleteLastMessages, deleteMessage, genAddressLink, genChainLink, genTokenLink, getChain, getRoute, getTokenInfo, reply } from "../../util";
import { emojs } from "../../../libs/constants2";
import { selectChainBtn, selectOrderTypeBtn, selectWalletBtn } from '../../util'
import { getDAIAddr, getUSDCAddr, getUSDTAddr, getWETHAddr, isNumeric } from "../../../libs";
import { isAddress } from "ethers-new";
import _ from "lodash";
import { getDoc, getListDocs } from "../../../libs/firestore";
import { OrderActions } from "../types";
import { confirmAddOrder } from "../command";

export const add2OrderWizard = new Scenes.WizardScene<BotContext>(
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
