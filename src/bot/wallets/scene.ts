import { Format, Markup, Scenes } from "telegraf";
import {
  BotContext,
  cancelBtn,
  cancelBtnStep1,
  cancelBtnStep2,
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
import { deleteLastMessage, deleteLastMessages, encrypt, estimateGas, genAddressLink, genChainLink, getAllTokenInWallet, getBalance, getChain, getTokenInfo, isVIP, reply, selectChainBtn, selectWalletBtn } from "../util";
import {
  leaveSceneWalletStep1,
  leaveSceneWalletStep2,
  leaveSceneWalletStep0,
  deleteWallet,
} from "./command";
import { emojs } from "../../libs/constants2";
import { Wallet } from "../../models";
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
    await deleteLastMessage(ctx);
    await reply(ctx, `${emojs.order} Transfer token:`);
    await reply(ctx, "Please select chain", selectChainBtn());
    return ctx.wizard.next();
  },
  async (ctx) => {
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
          ctx.scene.session.transferTokenAddr = transferTokenAddr
          ctx.scene.session.transferTokenData = transferTokenData
          const balance = await getBalance(ctx.scene.session.transferChain, ctx.scene.session.transferWallet, ctx.scene.session.transferTokenAddr)
          if (balance) {
            const bigZero = JSBI.BigInt(0);
            if (JSBI.EQ(balance, bigZero)) {
              await reply(ctx,
                `${emojs.error} Insufficient balance`
              );
              return ctx.scene.leave()
            } else {
              await deleteLastMessages(ctx, 2)
              const tokenBalance = parseFloat(ethers.formatUnits(balance.toString(), ctx.scene.session.transferTokenData.decimals))
              await reply(ctx, `${emojs.balance} Balance: ${tokenBalance}`)
              await estimateGas(ctx.scene.session.transferChain, ctx.scene.session.transferWallet, ctx.scene.session.transferTokenAddr)
              await reply(ctx, "Please enter received wallet address");
              return ctx.wizard.next();
            }
          } else {
            await reply(ctx,
              `${emojs.error} Insufficient balance`
            );
            return ctx.scene.leave()
          }
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
  async (ctx) => {
    if (!ctx.scene.session.transferChain) {
      await reply(ctx, 'Error')
      return ctx.scene.leave();
    }
    if (ctx.message && "text" in ctx.message && ctx.message.text && isAddress(ctx.message.text)) {
      ctx.scene.session.transferReceiveAddress = ctx.message.text

    } else {
      await reply(ctx,
        `${emojs.error} The receive wallet address is not in a valid format`
      );
    }
    return ctx.scene.leave();
  },
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
      await reply(ctx, Format.fmt`${emojs.checked} Chain: ${_chain}`)
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

transferWizard.action(/select_wallet_[a-zA-Z0-9]+/, async (ctx) => {
  const _math = ctx.match[0];
  const _wallet = _.replace(_math, "select_wallet_", "");
  ctx.scene.session.transferWallet = _wallet;
  if (!ctx.scene.session.transferChain) {
    await reply(ctx, `The chain is not supported`);
    return ctx.scene.leave();
  }
  await deleteLastMessage(ctx)
  await reply(ctx, Format.fmt`${emojs.checked} Wallet: ${Format.code(_wallet)}`)
  await reply(ctx,
    Format.fmt`Please enter the ERC-20 token address or /WETH, /USDC, /USDT, /DAI`, Markup.inlineKeyboard([Markup.button.callback(`${emojs.cancel} Cancel`, 'cancel')])
  );
});



export const walletScenes = [
  // addWalletWizard,
  deleteWalletWizard,
  editWalletWizard,
  createWalletWizard,
  editCurrentWalletWizard,
  deleteCurrentWalletWizard,
  transferWizard
];
