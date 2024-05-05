import { Format, Markup, Scenes } from "telegraf";
import {
  BotContext,
  cancelBtn,
  cancelBtnStep1,
  cancelBtnStep2,
  confirmInlineKeyboard,
  reTryBtn,
  yesOrNoInlineKeyboard,
} from "../../context";
import { ethers, isAddress } from "ethers-new";
import {
  create,
  getDoc,
  getListDocs,
  getServerTimeStamp,
  incrementNumericValue,
  isExists,
  updateDoc,
} from "../../../libs/firestore";
import {
  getDAIAddr,
  getUSDCAddr,
  getUSDTAddr,
  getWETHAddr,
  isNumeric,
  removeUndefined,
} from "../../../libs";
import {
  deleteLastMessage,
  deleteLastMessages,
  deleteMessage,
  encrypt,
  estimateGasTransfer,
  genChainLink,
  getBalance,
  getChain,
  getTokenInfo,
  getUserByTeleId,
  isVIP,
  reply,
  selectChainBtn,
  selectWalletIdBtn,
  selectWalletWLBtn,
  selectTokenBtn,
  transferERC20,
} from "../../util";
import {
  leaveSceneWalletStep1,
  leaveSceneWalletStep2,
  leaveSceneWalletStep0,
  deleteWallet,
  deleteWLWallet,
} from "../command";
import { emojs } from "../../../libs/constants2";
import { Wallet, WalletWhiteList } from "../../../models";
import _ from "lodash";
import JSBI from "jsbi";

export const transferWizard = new Scenes.WizardScene<BotContext>(
  "transferWizard",
  //Step 0
  async (ctx) => {
    console.log("step 0", ctx.wizard.cursor);
    await deleteLastMessage(ctx);
    await reply(ctx, `${emojs.order} Transfer token:`);
    await reply(ctx, "Please select chain", selectChainBtn());
    return ctx.wizard.next();
  },
  //Step 1: Process when user input token address
  async (ctx) => {
    if (!ctx.scene.session.transferChain) {
      await reply(ctx, `${emojs.error} You did not select the chain. Please try again.`)
      return ctx.scene.leave()
    }
    if (!ctx.scene.session.transferWalletId) {
      await reply(ctx, `${emojs.error} You did not select the wallet. Please try again.`)
      return ctx.scene.leave()
    }
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      const result = await processTransferTokenAddr(ctx, ctx.message.text)
      if (result) {
        return ctx.wizard.next()
      } else {
        return ctx.scene.leave()
      }
    } else {
      await reply(
        ctx,
        `${emojs.error} The token address is not in a valid format`
      );
    }
    return ctx.scene.leave();
  },
  //Step 2: Process when user input receiving wallet address
  async (ctx) => {
    if (!ctx.scene.session.transferTokenAddr) {
      await reply(ctx, `${emojs.error} You did not provide token address. Please try again.`)
      return ctx.scene.leave()
    }
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text &&
      isAddress(ctx.message.text)
    ) {
      const result = await processReceiveWallet(ctx, ctx.message.text);
      if (result) {
        return ctx.wizard.next();
      } else {
        return ctx.scene.leave();
      }
    } else {
      await reply(
        ctx,
        `${emojs.error} The receive wallet address is not in a valid format`
      );
      return ctx.scene.leave();
    }
  },
  //Step 3: Process when user input token amount
  async (ctx) => {
    if (!ctx.scene.session.transferReceiveAddress) {
      await reply(ctx, `${emojs.error} You did not provide receiving address. Please try again.`)
      return ctx.scene.leave()
    }
    const teleUser = ctx.from;
    if (!teleUser) {
      await reply(ctx, "User not found");
      return ctx.scene.leave();
    }
    if (!ctx.scene.session.transferChain) {
      await reply(ctx, "Error");
      return ctx.scene.leave();
    }
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text &&
      isNumeric(ctx.message.text)
    ) {
      ctx.scene.session.transferAmount = parseFloat(ctx.message.text);
      if (ctx.scene.session.transferAmount <= ctx.scene.session.tokenBalance) {
        await deleteLastMessages(ctx, 2);
        await reply(
          ctx,
          Format.fmt`${emojs.checked} Amount: ${Format.code(
            ctx.scene.session.transferAmount
          )}`
        );
        let msg = await reply(
          ctx,
          `${emojs.loading} Estimating gas fee, Please wait...`
        );
        const gasFees = await estimateGasTransfer(
          teleUser.id,
          ctx.scene.session.transferChain,
          ctx.scene.session.transferWalletId,
          ctx.scene.session.transferTokenAddr,
          ctx.scene.session.transferTokenData.decimals,
          ctx.scene.session.transferReceiveAddress,
          ctx.scene.session.transferAmount
        );
        if (msg) {
          await deleteMessage(ctx, msg.message_id);
        }
        if (gasFees) {
          const strItems = [
            Format.fmt`${emojs.gas} Gas fee: ${gasFees.txPriceEth} ETH = ${gasFees.txPriceUSD} USD\n`,
          ];
          strItems.push(
            Format.fmt`${Format.bold("Are you sure you want to transfer?")}\n`
          );
          await reply(ctx, Format.join(strItems), confirmInlineKeyboard);
          return ctx.wizard.next();
        } else {
          await reply(ctx, "Can not estimate gas Fee");
          return ctx.scene.leave();
        }
      } else {
        await reply(ctx, `${emojs.error} Insufficient amount`, reTryBtn);
        return ctx.wizard.next();
      }
    } else {
      await reply(ctx, `${emojs.error} The Amount is not in a valid format`, reTryBtn);
      return ctx.wizard.next()
    }
    return ctx.scene.leave();
  }
);


transferWizard.action(/select_chain_[a-z_]+/, async (ctx) => {
  const _math = ctx.match[0];
  const _chain = _.replace(_math, "select_chain_", "");
  const chainInfo = getChain(_chain);
  if (chainInfo && _chain) {
    ctx.scene.session.transferChain = chainInfo.chain;
    ctx.scene.session.transferChainId = chainInfo.chainId;
    await deleteLastMessage(ctx);
    const chainLink = genChainLink(_chain);
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
      await reply(
        ctx,
        Format.fmt`${emojs.checked} Chain: ${_chain.toUpperCase()}`
      );
      return reply(ctx, "Please select the wallet", selectWalletIdBtn(wallets));
    } else {
      await reply(ctx, `The chain ${_chain} is not supported`);
      ctx.scene.leave();
    }
  } else {
    await reply(ctx, `The chain ${_chain} is not supported`);
    ctx.scene.leave();
  }
});

transferWizard.action(/select_wallet_[a-zA-Z0-9]+/, async (ctx) => {
  const teleUser = ctx.from;
  if (!teleUser) {
    await reply(ctx, "User not found");
    return ctx.scene.leave();
  }
  const _math = ctx.match[0];
  const _walletId = _.replace(_math, "select_wallet_", "");
  const wallet: any = await getDoc("wallets", _walletId);
  if (wallet) {
    ctx.scene.session.transferWallet = wallet.wallet;
    ctx.scene.session.transferWalletId = wallet.id;
    if (!ctx.scene.session.transferChain) {
      await reply(ctx, `The chain is not supported`);
      return ctx.scene.leave();
    }
    await deleteLastMessage(ctx);
    await reply(
      ctx,
      Format.fmt`${emojs.checked} From: ${Format.code(wallet.wallet)}`
    );
    await reply(
      ctx,
      "Please enter token address or select token below",
      selectTokenBtn(ctx.scene.session.transferChain)
    );
  } else {
    await reply(ctx, `Wallet not found`);
    return ctx.scene.leave();
  }
});
//Handle action for select receive wallet in whitelist
transferWizard.action(/swlw_[a-zA-Z0-9]+/, async (ctx) => {
  const _math = ctx.match[0];
  const _walletAddr = _.replace(_math, "swlw_", "");
  const result = await processReceiveWallet(ctx, _walletAddr);
  if (result) {
    return ctx.wizard.selectStep(3);
  } else {
    return ctx.scene.leave();
  }
});

//Handle action for select transfer token address
transferWizard.action(/stkn_[a-zA-Z0-9]+/, async (ctx) => {
  const _math = ctx.match[0];
  const _tokenAddr = _.replace(_math, "stkn_", "");
  const result = await processTransferTokenAddr(ctx, _tokenAddr);
  if (!result) {
    return ctx.scene.leave()
  }
});

transferWizard.action("confirm", async (ctx) => {
  await deleteLastMessage(ctx)
  const teleUser = ctx.from;
  if (!teleUser || !ctx.scene.session.transferChain) {
    return ctx.scene.leave();
  }
  await transferERC20(
    ctx,
    teleUser.id,
    ctx.scene.session.transferChain,
    ctx.scene.session.transferWalletId,
    ctx.scene.session.transferTokenAddr,
    ctx.scene.session.transferTokenData.decimals,
    ctx.scene.session.transferReceiveAddress,
    ctx.scene.session.transferAmount
  );
  ctx.scene.session.transferDone = true;
  //Check if received address in whitelist or not
  const isInWhitelist = await isExists("wallets_whitelist", null, [
    { field: 'telegram_id', operation: '==', value: teleUser.id },
    { field: 'wallet', operation: '==', value: ctx.scene.session.transferReceiveAddress.toLowerCase() }
  ])
  if (!isInWhitelist) {
    await reply(
      ctx,
      "OK, Done",
      Markup.inlineKeyboard([
        Markup.button.callback(
          `${emojs.add} Add receiving wallet to whitelist`,
          "add_receive_to_whitelist"
        ),
      ])
    );
  } else {
    return ctx.scene.leave()
  }
});

transferWizard.action("not_confirm", async (ctx) => {
  await reply(ctx, "Cancel");
  return ctx.scene.leave();
});

transferWizard.action("cancel", async (ctx) => {
  await reply(ctx, "Cancel");
  return ctx.scene.leave();
});

transferWizard.action("add_receive_to_whitelist", async (ctx) => {
  return ctx.scene.enter("addWhiteListWalletWizard", {
    walletWLAddr: ctx.scene.session.transferReceiveAddress,
  });
});

transferWizard.action("try_again", async (ctx) => {
  await deleteLastMessages(ctx, 2)
  return ctx.wizard.selectStep(ctx.wizard.cursor - 1)
});

const processTransferTokenAddr = async (
  ctx: BotContext,
  tokenAddr: string
): Promise<boolean> => {
  const teleUser = ctx.from;
    if (!teleUser) {
      await reply(ctx, "User not found");
      return false
    }
  if (!isAddress(tokenAddr)) {
    await reply(ctx, `${emojs.error} Token address is invalid format`);
    return false
  }
  if (!ctx.scene.session.transferChain) {
    await reply(ctx, `${emojs.error} Chain not selected`);
    return false;
  }
  const transferTokenData = await getTokenInfo(
    ctx.scene.session.transferChain,
    tokenAddr
  );
  if (transferTokenData) {
    await deleteLastMessages(ctx, 2);
    await reply(
      ctx,
      `${emojs.checked} Token: ${transferTokenData.symbol}`
    );
    ctx.scene.session.transferTokenAddr = tokenAddr;
    ctx.scene.session.transferTokenData = transferTokenData;
    const walletWLs = await getListDocs("wallets_whitelist", [
      { field: "telegram_id", operation: "==", value: teleUser.id },
    ]);
    await reply(
      ctx,
      "Please enter Receiving address",
      selectWalletWLBtn(walletWLs)
    );
    return true
  } else {
    await reply(
      ctx,
      `${emojs.error} The token address is not in a valid format`
    );
  }
  return false
};

const processReceiveWallet = async (
  ctx: BotContext,
  wallet: string
): Promise<boolean> => {
  if (!ctx.scene.session.transferChain) {
    await reply(ctx, `${emojs.error} Chain not selected`);
    return false;
  }
  ctx.scene.session.transferReceiveAddress = wallet;
  await deleteLastMessages(ctx, 2);
  await reply(
    ctx,
    Format.fmt`${emojs.checked} To: ${Format.code(wallet.toLowerCase())}`
  );
  let msg = await reply(
    ctx,
    `${emojs.loading} Getting your token balance, Please wait...`
  );
  const balance = await getBalance(
    ctx.scene.session.transferChain,
    ctx.scene.session.transferWallet,
    ctx.scene.session.transferTokenAddr
  );
  if (msg) {
    await deleteMessage(ctx, msg.message_id);
  }
  if (balance) {
    const bigZero = JSBI.BigInt(0);
    if (JSBI.EQ(balance, bigZero)) {
      await reply(ctx, `${emojs.error} Insufficient balance`);
      return false;
    } else {
      const tokenBalance = parseFloat(
        ethers.formatUnits(
          balance.toString(),
          ctx.scene.session.transferTokenData.decimals
        )
      );
      ctx.scene.session.tokenBalance = tokenBalance;
      await reply(
        ctx,
        Format.fmt`${emojs.balance} Balance: ${Format.code(tokenBalance)}`
      );
      await reply(ctx, `Please enter amount to transfer`, cancelBtn);
      return true;
    }
  } else {
    await reply(ctx, `${emojs.error} Insufficient balance`);
    return false;
  }
};