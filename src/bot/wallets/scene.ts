import { Format, Markup, Scenes } from "telegraf";
import {
  BotContext,
  cancelBtn,
  cancelBtnStep1,
  cancelBtnStep2,
  confirmInlineKeyboard,
  yesOrNoInlineKeyboard,
} from "../context";
import { ethers, isAddress } from "ethers-new";
import {
  create,
  getDoc,
  getListDocs,
  getServerTimeStamp,
  incrementNumericValue,
  isExists,
  updateDoc,
} from "../../libs/firestore";
import { getDAIAddr, getUSDCAddr, getUSDTAddr, getWETHAddr, isNumeric, removeUndefined } from "../../libs";
import { deleteLastMessage, deleteLastMessages, deleteMessage, encrypt, estimateGasTransfer, genChainLink, getBalance, getChain, getTokenInfo, isVIP, reply, selectChainBtn, selectWalletIdBtn, selectWalletWLBtn } from "../util";
import {
  leaveSceneWalletStep1,
  leaveSceneWalletStep2,
  leaveSceneWalletStep0,
  deleteWallet,
} from "./command";
import { emojs } from "../../libs/constants2";
import { Wallet, WalletWhiteList } from "../../models";
import _ from "lodash";
import JSBI from "jsbi";

const addWalletWizard = new Scenes.WizardScene<BotContext>(
  "addWalletWizard", // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx);
    await reply(ctx, "Please enter the wallet address", cancelBtn);
    ctx.scene.session.walletAddress = "";
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      if (isAddress(ctx.message.text)) {
        const teleUser = ctx.from;
        if (!teleUser) {
          return reply(ctx, "User not found");
        }
        const isWalletExist = await isExists("wallets", null, [
          {
            field: "wallet",
            operation: "==",
            value: ctx.message.text,
          },
          {
            field: "telegram_id",
            operation: "==",
            value: teleUser.id,
          },
        ]);
        if (!isWalletExist) {
          ctx.scene.session.walletAddress = ctx.message.text;
          await reply(ctx, "Please enter name for the wallet", cancelBtnStep1);
        } else {
          await reply(ctx,
            Format.fmt`Wallet: ${Format.code(ctx.message.text)} exists`
          );
          return ctx.scene.leave();
        }
      } else {
        await reply(ctx, "Wallet is invalid format!");
        return ctx.scene.leave();
      }
    }
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const teleUser = ctx.from;
      if (!teleUser) {
        await reply(ctx, "User not found");
        return ctx.scene.leave();
      }
      const user = await getDoc("users", null, [
        {
          field: "telegram_id",
          operation: "==",
          value: teleUser.id,
        },
      ]);
      if (!user) {
        await reply(ctx, "User not found");
        return ctx.scene.leave();
      }
      ctx.scene.session.walletName = ctx.message.text;
      const newWallet: Wallet = {
        wallet: ctx.scene.session.walletAddress.toLowerCase(),
        user_id: user.id,
        create_at: getServerTimeStamp(),
        name: ctx.message.text,
        telegram_id: teleUser.id,
        private_key: '',
        seed_pharse: ''
      };
      const result = await create("wallets", null, removeUndefined(newWallet));
      if (result) {
        await reply(ctx,
          Format.fmt`Wallet added:\nAddress: ${Format.code(
            ctx.scene.session.walletAddress
          )}\nName: ${Format.code(ctx.scene.session.walletName)}`
        );
        return ctx.scene.leave();
      } else {
        await reply(ctx,
          Format.fmt`Wallet: ${Format.code(ctx.message.text)} add error`
        );
        return ctx.scene.leave();
      }
    }
  }
);

const deleteWalletWizard = new Scenes.WizardScene<BotContext>(
  "deleteWalletWizard", // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx);
    await reply(ctx,
      "Please enter the wallet ID that you want to delete",
      cancelBtn
    );
    ctx.scene.session.idWalletToDelete = "";
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      const isWalletExist = await isExists("wallets", ctx.message.text);
      if (isWalletExist) {
        ctx.scene.session.idWalletToDelete = ctx.message.text;
      }
    } else {
      return ctx.wizard.next();
    }
    await reply(ctx,
      Format.fmt`Are you sure to delete the wallet?`,
      yesOrNoInlineKeyboard
    );
    return ctx.wizard.next();
  }
);

const editWalletWizard = new Scenes.WizardScene<BotContext>(
  "editWalletWizard", // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx);
    await reply(ctx,
      "Please enter the wallet ID that you want to edit",
      cancelBtn
    );
    ctx.scene.session.idWalletToEdit = "";
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      const wallet = await getDoc("wallets", ctx.message.text);
      if (wallet) {
        ctx.scene.session.idWalletToEdit = ctx.message.text;
      } else {
        await reply(ctx, Format.fmt`Wallet not found`);
        return ctx.scene.leave();
      }
    } else {
      return ctx.wizard.next();
    }
    await reply(ctx,
      Format.fmt`Enter new name for ${Format.code("address")}`,
      cancelBtnStep2
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      await updateDoc("wallets", ctx.scene.session.idWalletToEdit, {
        name: ctx.message.text,
      });
      await reply(ctx,
        Format.fmt`Wallet address ${Format.code(
          ctx.scene.session.idWalletToEdit
        )} updated`
      );
    } else {
      await reply(ctx, "Cancel");
    }
    return ctx.scene.leave();
  }
);

const createWalletWizard = new Scenes.WizardScene<BotContext>(
  "createWalletWizard",
  async (ctx) => {
    await deleteLastMessage(ctx);
    await reply(ctx, "Please enter wallet name", cancelBtn);
    ctx.scene.session.createWalletName = "";
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const teleUser = ctx.from;
      if (!teleUser) {
        await reply(ctx, "User not found");
        return ctx.scene.leave();
      }
      const user: any = await getDoc("users", null, [
        {
          field: "telegram_id",
          operation: "==",
          value: teleUser.id,
        },
      ]);
      if (!user) {
        await reply(ctx, "User not found");
        return ctx.scene.leave();
      }
      if (!isVIP(user) && user.count_wallets > 0) {
        await reply(ctx, `${emojs.error} You can create maximum 1 wallet. Please upgrade to VIP account`);
        return ctx.scene.leave();
      }
      const isWalletNameExist = await isExists("wallets", null, [
        {
          field: "name",
          operation: "==",
          value: ctx.message.text,
        },
        {
          field: "telegram_id",
          operation: "==",
          value: teleUser.id,
        },
      ]);
      if (!isWalletNameExist) {
        const wallet = ethers.Wallet.createRandom()
        console.log('address:', wallet.address)
        if (wallet.mnemonic) {
          console.log('mnemonic:', wallet.mnemonic.phrase)
        }
        console.log('privateKey:', wallet.privateKey)

        const newWallet: Wallet = {
          wallet: wallet.address.toLowerCase(),
          user_id: user.id,
          create_at: getServerTimeStamp(),
          name: ctx.message.text,
          telegram_id: teleUser.id,
          private_key: encrypt(teleUser.id, wallet.privateKey),
          seed_pharse: wallet.mnemonic ? encrypt(teleUser.id, wallet.mnemonic.phrase) : ''
        };
        const result = await create("wallets", null, removeUndefined(newWallet));
        await incrementNumericValue("users", user.id, "count_wallets")
        if (result) {
          const strs = [
            Format.fmt`Wallet added:\n`,
            Format.fmt` ${emojs.address} ${Format.bold('Address')}: ${Format.code(wallet.address.toLowerCase())}\n`,
            Format.fmt` ${emojs.name} ${Format.bold('Name')}: ${Format.code(ctx.message.text)}\n`,
            Format.fmt` ${emojs.key} ${Format.bold('Private key')}: ${Format.spoiler(wallet.privateKey)}\n`,
            Format.fmt` ${emojs.seed} ${Format.bold('Seed pharse')}: ${Format.spoiler(wallet.mnemonic ? wallet.mnemonic.phrase : '')}\n`
          ]
          await reply(ctx, Format.join(strs));
          return ctx.scene.leave();
        } else {
          await reply(ctx,
            Format.fmt`Wallet: ${Format.code(ctx.message.text)} add error`
          );
          return ctx.scene.leave();
        }
      } else {
        await reply(ctx,
          Format.fmt`Wallet name: ${Format.code(ctx.message.text)} exists`
        );
        return ctx.scene.leave();
      }
    }
    return ctx.scene.leave();
  }
);

const editCurrentWalletWizard = new Scenes.WizardScene<BotContext>(
  "editCurrentWalletWizard", // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx)
    if (ctx.scene.session.state && "idWalletToEdit" in ctx.scene.session.state && ctx.scene.session.state.idWalletToEdit && _.isString(ctx.scene.session.state.idWalletToEdit)) {
      const wallet: any = await getDoc("wallets", ctx.scene.session.state.idWalletToEdit);
      if (wallet) {
        ctx.scene.session.idWalletToEdit = ctx.scene.session.state.idWalletToEdit;
        await reply(ctx,
          Format.fmt`Enter new name for wallet?\nAddress: ${Format.code(wallet.wallet)}`,
          cancelBtn
        );
        return ctx.wizard.next();
      } else {
        await reply(ctx, Format.fmt`Wallet not found`);
        return ctx.scene.leave();
      }
    } else {
      return ctx.wizard.next();
    }
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      await updateDoc("wallets", ctx.scene.session.idWalletToEdit, {
        name: ctx.message.text,
      });
      await reply(ctx,
        Format.fmt`Wallet address ${Format.code(
          ctx.scene.session.idWalletToEdit
        )} updated`
      );
    } else {
      await reply(ctx, "Cancel");
    }
    return ctx.scene.leave();
  }
);

const deleteCurrentWalletWizard = new Scenes.WizardScene<BotContext>(
  "deleteCurrentWalletWizard", // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx)
    if (ctx.scene.session.state && "idWalletToDelete" in ctx.scene.session.state && ctx.scene.session.state.idWalletToDelete && _.isString(ctx.scene.session.state.idWalletToDelete)) {
      const _wallet: any = await getDoc("wallets", ctx.scene.session.state.idWalletToDelete)
      if (_wallet) {
        ctx.scene.session.idWalletToDelete = ctx.scene.session.state.idWalletToDelete;
        await reply(ctx,
          Format.fmt`Are you sure to delete wallet?\nAddress: ${Format.code(_wallet.wallet)}\nName:${Format.code(_wallet.name)}`,
          yesOrNoInlineKeyboard
        );
        return ctx.wizard.next();
      } else {
        await reply(ctx, 'Wallet not found')
        return ctx.scene.leave()
      }
    } else {
      return ctx.wizard.next();
    }
  }
);




//=============================
const transferWizard = new Scenes.WizardScene<BotContext>(
  "transferWizard",
  async (ctx) => {
    console.log('step 0', ctx.wizard.cursor)
    await deleteLastMessage(ctx);
    await reply(ctx, `${emojs.order} Transfer token:`);
    await reply(ctx, "Please select chain", selectChainBtn());
    return ctx.wizard.next();
  },
  async (ctx) => {
    const teleUser = ctx.from;
    if (!teleUser) {
      await reply(ctx, "User not found");
      return ctx.scene.leave();
    }
    if (!ctx.scene.session.transferChain) {
      return ctx.scene.leave();
    }
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      let transferTokenAddr = null;
      if (ctx.message.text.toUpperCase() === "/WETH" || ctx.message.text.toUpperCase() === "WETH") {
        transferTokenAddr = getWETHAddr(ctx.scene.session.transferChainId);
      } else if (ctx.message.text.toUpperCase() === "USDT" || ctx.message.text.toUpperCase() === "/USDT") {
        transferTokenAddr = getUSDTAddr(ctx.scene.session.transferChainId);
      } else if (ctx.message.text.toUpperCase() === "USDC" || ctx.message.text.toUpperCase() === "/USDC") {
        transferTokenAddr = getUSDCAddr(ctx.scene.session.transferChainId);
      } else if (ctx.message.text.toUpperCase() === "DAI" || ctx.message.text.toUpperCase() === "/DAI") {
        transferTokenAddr = getDAIAddr(ctx.scene.session.transferChainId);
      }
      else if (isAddress(ctx.message.text)) {
        transferTokenAddr = ctx.message.text;
      }
      if (transferTokenAddr) {
        const transferTokenData = await getTokenInfo(
          ctx.scene.session.transferChain,
          transferTokenAddr
        );
        if (transferTokenData) {
          await deleteLastMessages(ctx, 2)
          await reply(ctx, `${emojs.checked} Token: ${transferTokenData.symbol}`);
          ctx.scene.session.transferTokenAddr = transferTokenAddr
          ctx.scene.session.transferTokenData = transferTokenData
          const walletWLs = await getListDocs("wallets_whitelist", [
            { field: 'telegram_id', operation: '==', value: teleUser.id }
          ])
          await reply(ctx, "Please enter Receiving address", selectWalletWLBtn(walletWLs));
          return ctx.wizard.next()
        } else {
          await reply(ctx,
            `${emojs.error} The token address is not in a valid format`
          );
        }
      } else {
        await reply(ctx,
          `${emojs.error} Token address ${transferTokenAddr} not found`
        );
      }
    } else {
      await reply(ctx,
        `${emojs.error} The token address is not in a valid format`
      );
    }
    return ctx.scene.leave();
  },
  //Process when user input receiving wallet address
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text && isAddress(ctx.message.text)) {
      const result = await processReceiveWallet(ctx, ctx.message.text);
      if (result) {
        return ctx.wizard.next()
      } else {
        return ctx.scene.leave()
      }
    } else {
      await reply(ctx,
        `${emojs.error} The receive wallet address is not in a valid format`
      );
      return ctx.scene.leave();
    }

  },
  async (ctx) => {
    const teleUser = ctx.from;
    if (!teleUser) {
      await reply(ctx, "User not found");
      return ctx.scene.leave();
    }
    if (!ctx.scene.session.transferChain) {
      await reply(ctx, 'Error')
      return ctx.scene.leave();
    }
    if (ctx.message && "text" in ctx.message && ctx.message.text && isAddress(ctx.message.text)) {
      ctx.scene.session.transferReceiveAddress = ctx.message.text
      await deleteLastMessages(ctx, 2)
      await reply(ctx, Format.fmt`${emojs.checked} To: ${Format.code(ctx.message.text.toLowerCase())}`)
      let msg = await reply(ctx, `${emojs.loading} Getting your token balance, Please wait...`)
      const balance = await getBalance(ctx.scene.session.transferChain, ctx.scene.session.transferWallet, ctx.scene.session.transferTokenAddr)
      if (msg) {
        await deleteMessage(ctx, msg.message_id)
      }
      if (balance) {
        const bigZero = JSBI.BigInt(0);
        if (JSBI.EQ(balance, bigZero)) {
          await reply(ctx,
            `${emojs.error} Insufficient balance`
          );
          return ctx.scene.leave()
        } else {
          const tokenBalance = parseFloat(ethers.formatUnits(balance.toString(), ctx.scene.session.transferTokenData.decimals))
          await reply(ctx, Format.fmt`${emojs.balance} Balance: ${Format.code(tokenBalance)}`)
          await reply(ctx, `Please enter amount to transfer`)
          return ctx.wizard.next()
        }
      } else {
        await reply(ctx,
          `${emojs.error} Insufficient balance`
        );
        return ctx.scene.leave()
      }
    } else {
      await reply(ctx,
        `${emojs.error} The receive wallet address is not in a valid format`
      );
    }
    return ctx.scene.leave();
  },
  async (ctx) => {
    const teleUser = ctx.from;
    if (!teleUser) {
      await reply(ctx, "User not found");
      return ctx.scene.leave();
    }
    if (!ctx.scene.session.transferChain) {
      await reply(ctx, 'Error')
      return ctx.scene.leave();
    }
    if (ctx.message && "text" in ctx.message && ctx.message.text && isNumeric(ctx.message.text)) {
      ctx.scene.session.transferAmount = parseFloat(ctx.message.text);
      if (ctx.scene.session.transferAmount <= ctx.scene.session.tokenBalance) {
        await deleteLastMessages(ctx, 2)
        await reply(ctx, Format.fmt`${emojs.checked} Amount: ${Format.code(ctx.scene.session.transferAmount)}`)
        let msg = await reply(ctx, `${emojs.loading} Estimating gas fee, Please wait...`)
        const gasFees = await estimateGasTransfer(teleUser.id, ctx.scene.session.transferChain, ctx.scene.session.transferWalletId, ctx.scene.session.transferTokenAddr
          , ctx.scene.session.transferTokenData.decimals, ctx.scene.session.transferReceiveAddress, ctx.scene.session.transferAmount
        )
        if (msg) {
          await deleteMessage(ctx, msg.message_id)
        }
        if (gasFees) {
          const strItems = [Format.fmt`${emojs.gas} Gas fee: ${gasFees.txPriceEth} ETH = ${gasFees.txPriceUSD} USD\n`];
          strItems.push(Format.fmt`${Format.bold("Are you sure you want to transfer?")}\n`)
          await reply(ctx, Format.join(strItems), confirmInlineKeyboard);
          return ctx.wizard.next();
        } else {
          await reply(ctx, "Can not estimate gas Fee");
          return ctx.scene.leave()
        }
      } else {
        await reply(ctx,
          `${emojs.error} Insufficient amount`
        );
        return ctx.scene.leave()
      }
    } else {
      await reply(ctx,
        `${emojs.error} The Amount is not in a valid format`
      );
    }
    return ctx.scene.leave();
  },
  async (ctx) => {
    if (ctx.scene.session.transferDone) {
      if (ctx.message && "text" in ctx.message && ctx.message.text) {
        const teleUser = ctx.from;
        if (!teleUser) {
          await reply(ctx, "User not found");
          return ctx.scene.leave();
        }
        const user: any = await getDoc("users", null, [
          {
            field: "telegram_id",
            operation: "==",
            value: teleUser.id,
          },
        ]);
        if (!user) {
          await reply(ctx, "User not found");
          return ctx.scene.leave();
        }
        if (!isVIP(user) && user.count_wallets_wl > 0) {
          await reply(ctx, `${emojs.error} You can create maximum 1 wallet whitelist. Please upgrade to VIP account`);
          return ctx.scene.leave();
        }
        const isWalletNameExist = await isExists("wallets_whitelist", null, [
          {
            field: "name",
            operation: "==",
            value: ctx.message.text,
          },
          {
            field: "telegram_id",
            operation: "==",
            value: teleUser.id,
          },
        ]);
        if (isWalletNameExist) {
          await reply(ctx,
            Format.fmt`Wallet name: ${Format.code(ctx.message.text)} exists`
          );
          return ctx.scene.leave();
        }
        const newWhiteList: WalletWhiteList = {
          wallet: ctx.scene.session.transferReceiveAddress.toLowerCase(),
          user_id: user.id,
          create_at: getServerTimeStamp(),
          name: ctx.message.text,
          telegram_id: teleUser.id,
        };
        const result = await create("wallets_whitelist", null, removeUndefined(newWhiteList));
        if (result) {
          await incrementNumericValue("users", user.id, "count_wallets_wl")
          await reply(ctx,
            Format.fmt`Wallet added to whitelist:\nAddress: ${Format.code(
              ctx.scene.session.transferReceiveAddress.toLowerCase()
            )}\nName: ${Format.code(ctx.message.text)}`
          );
          return ctx.scene.leave();
        } else {
          await reply(ctx,
            Format.fmt`Wallet: ${Format.code(ctx.message.text)} add error`
          );
          return ctx.scene.leave();
        }
      } else {
        await reply(ctx, "Cancel");
      }
    }
    return ctx.scene.leave();
  }
);
//=============================

addWalletWizard.action("leave", leaveSceneWalletStep0);
addWalletWizard.action("leave_step_1", leaveSceneWalletStep1);
editWalletWizard.action("leave", leaveSceneWalletStep0);
editWalletWizard.action("leave_step_2", leaveSceneWalletStep2);
deleteWalletWizard.action("leave", leaveSceneWalletStep0);
createWalletWizard.action("leave", leaveSceneWalletStep0);
deleteWalletWizard.action("yes", deleteWallet);
deleteWalletWizard.action("no", leaveSceneWalletStep2);

deleteCurrentWalletWizard.action("yes", deleteWallet);
deleteCurrentWalletWizard.action("no", async (ctx) => {
  await deleteLastMessage(ctx)
  return ctx.scene.leave()
});
editCurrentWalletWizard.action("leave", async (ctx) => {
  await deleteLastMessage(ctx)
  return ctx.scene.leave()
})




transferWizard.action(/select_chain_[a-z_]+/, async (ctx) => {
  const _math = ctx.match[0];
  const _chain = _.replace(_math, "select_chain_", "");
  const chainInfo = getChain(_chain);
  if (chainInfo && _chain) {
    ctx.scene.session.transferChain = chainInfo.chain;
    ctx.scene.session.transferChainId = chainInfo.chainId;
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
      await reply(ctx, Format.fmt`${emojs.checked} Chain: ${_chain.toUpperCase()}`)
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
  const _math = ctx.match[0];
  const _walletId = _.replace(_math, "select_wallet_", "");
  const wallet: any = await getDoc("wallets", _walletId)
  if (wallet) {
    ctx.scene.session.transferWallet = wallet.wallet;
    ctx.scene.session.transferWalletId = wallet.id;
    if (!ctx.scene.session.transferChain) {
      await reply(ctx, `The chain is not supported`);
      return ctx.scene.leave();
    }
    await deleteLastMessage(ctx)
    await reply(ctx, Format.fmt`${emojs.checked} From: ${Format.code(wallet.wallet)}`)
    await reply(ctx,
      Format.fmt`Please enter the ERC-20 token address or /WETH, /USDC, /USDT, /DAI`, Markup.inlineKeyboard([Markup.button.callback(`${emojs.cancel} Cancel`, 'cancel')])
    );
  } else {
    await reply(ctx, `Wallet not found`);
    return ctx.scene.leave();
  }
});

transferWizard.action(/swlw_[a-zA-Z0-9]+/, async (ctx) => {
  const _math = ctx.match[0];
  const _walletAddr = _.replace(_math, "swlw_", "");
  const result = await processReceiveWallet(ctx, _walletAddr);
  if (result) {
    return ctx.wizard.selectStep(3)
  } else {
    return ctx.scene.leave()
  }
});

transferWizard.action("confirm", async (ctx) => {
  ctx.scene.session.transferDone = true
  await reply(ctx, 'OK, Done', Markup.inlineKeyboard([Markup.button.callback(`${emojs.add} Add receiving wallet to whitelist`, "add_receive_to_whitelist")]))
});

transferWizard.action("not_confirm", async (ctx) => {
  await reply(ctx, 'Cancel')
  return ctx.scene.leave()
});

transferWizard.action("add_receive_to_whitelist", async (ctx) => {
  await reply(ctx,
    Format.fmt`Enter the name for wallet?\nAddress: ${Format.code(ctx.scene.session.transferReceiveAddress)}`,
    cancelBtn
  );
});
editCurrentWalletWizard.action("leave", async (ctx) => {
  return ctx.scene.leave()
})


export const walletScenes = [
  // addWalletWizard,
  deleteWalletWizard,
  editWalletWizard,
  createWalletWizard,
  editCurrentWalletWizard,
  deleteCurrentWalletWizard,
  transferWizard
];



//Private method
const processReceiveWallet = async (ctx: BotContext, wallet: string): Promise<boolean> => {
  if (!ctx.scene.session.transferChain) {
    await reply(ctx,
      `${emojs.error} Chain not selected`
    );
    return false
  }
  ctx.scene.session.transferReceiveAddress = wallet
  await deleteLastMessages(ctx, 2)
  await reply(ctx, Format.fmt`${emojs.checked} To: ${Format.code(wallet.toLowerCase())}`)
  let msg = await reply(ctx, `${emojs.loading} Getting your token balance, Please wait...`)
  const balance = await getBalance(ctx.scene.session.transferChain, ctx.scene.session.transferWallet, ctx.scene.session.transferTokenAddr)
  if (msg) {
    await deleteMessage(ctx, msg.message_id)
  }
  if (balance) {
    const bigZero = JSBI.BigInt(0);
    if (JSBI.EQ(balance, bigZero)) {
      await reply(ctx,
        `${emojs.error} Insufficient balance`
      );
      return false
    } else {
      const tokenBalance = parseFloat(ethers.formatUnits(balance.toString(), ctx.scene.session.transferTokenData.decimals))
      await reply(ctx, Format.fmt`${emojs.balance} Balance: ${Format.code(tokenBalance)}`)
      await reply(ctx, `Please enter amount to transfer`)
      return true
    }
  } else {
    await reply(ctx,
      `${emojs.error} Insufficient balance`
    );
    return false
  }
}
