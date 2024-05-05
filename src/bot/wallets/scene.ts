import { Format, Markup, Scenes } from "telegraf";
import {
  BotContext,
  cancelBtn,
  cancelBtnStep1,
  cancelBtnStep2,
  confirmInlineKeyboard,
  reTryBtn,
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
import {
  getDAIAddr,
  getUSDCAddr,
  getUSDTAddr,
  getWETHAddr,
  isNumeric,
  removeUndefined,
} from "../../libs";
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
} from "../util";
import {
  leaveSceneWalletStep1,
  leaveSceneWalletStep2,
  leaveSceneWalletStep0,
  deleteWallet,
  deleteWLWallet,
} from "./command";
import { emojs } from "../../libs/constants2";
import { Wallet, WalletWhiteList } from "../../models";
import _ from "lodash";
import JSBI from "jsbi";
import { transferWizard } from "./scenes/transfer";
import { editWLWalletWizard } from "./scenes/edit_wl_wallet";

const addWhiteListWalletWizard = new Scenes.WizardScene<BotContext>(
  "addWhiteListWalletWizard", // first argument is Scene_ID, same as for BaseScene
  //Step 0: Getting wallet address or require user input wallet
  async (ctx) => {
    const teleUser = ctx.from;
    if (!teleUser) {
      return reply(ctx, "User not found");
    }
    await deleteLastMessage(ctx);
    if (
      ctx.scene.session.state &&
      "walletWLAddr" in ctx.scene.session.state &&
      ctx.scene.session.state.walletWLAddr &&
      _.isString(ctx.scene.session.state.walletWLAddr)
    ) {
      const _result = await processUserInputWLWallet(
        ctx,
        ctx.scene.session.state.walletWLAddr
      );
      if (_result) {
        return ctx.wizard.selectStep(2);
      } else {
        return ctx.scene.leave();
      }
    } else {
      await reply(ctx, Format.fmt`Enter wallet address:`, cancelBtn);
      return ctx.wizard.next();
    }
  },
  //Step 1: Getting wallet
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const _result = await processUserInputWLWallet(ctx, ctx.message.text);
      if (!_result) {
        return ctx.scene.leave();
      }
    }
    return ctx.wizard.next();
  },
  //Step 2: Getting wallet name
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const teleUser = ctx.from;
      if (!teleUser) {
        await reply(ctx, "User not found");
        return ctx.scene.leave();
      }
      const user = await getUserByTeleId(teleUser.id);
      if (!user) {
        await reply(ctx, "User not found");
        return ctx.scene.leave();
      }
      ctx.scene.session.walletWLName = ctx.message.text;
      const newWLWallet: WalletWhiteList = {
        wallet: ctx.scene.session.walletWLAddr.toLowerCase(),
        user_id: user.id,
        create_at: getServerTimeStamp(),
        name: ctx.scene.session.walletWLName,
        telegram_id: teleUser.id,
      };
      const result = await create(
        "wallets_whitelist",
        null,
        removeUndefined(newWLWallet)
      );
      if (result) {
        await reply(
          ctx,
          Format.fmt`Wallet added:\nAddress: ${Format.code(
            ctx.scene.session.walletWLAddr
          )}\nName: ${Format.code(ctx.scene.session.walletWLName)}`
        );
        return ctx.scene.leave();
      } else {
        await reply(
          ctx,
          Format.fmt`Wallet: ${Format.code(
            ctx.scene.session.walletWLAddr
          )} add error`
        );
        return ctx.scene.leave();
      }
    }
  }
);

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
          await reply(
            ctx,
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
        private_key: "",
        seed_pharse: "",
      };
      const result = await create("wallets", null, removeUndefined(newWallet));
      if (result) {
        await reply(
          ctx,
          Format.fmt`Wallet added:\nAddress: ${Format.code(
            ctx.scene.session.walletAddress
          )}\nName: ${Format.code(ctx.scene.session.walletName)}`
        );
        return ctx.scene.leave();
      } else {
        await reply(
          ctx,
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
    await reply(
      ctx,
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
    await reply(
      ctx,
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
    await reply(
      ctx,
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
    await reply(
      ctx,
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
      await reply(
        ctx,
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
        await reply(
          ctx,
          `${emojs.error} You can create maximum 1 wallet. Please upgrade to VIP account`
        );
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
        const wallet = ethers.Wallet.createRandom();
        console.log("address:", wallet.address);
        if (wallet.mnemonic) {
          console.log("mnemonic:", wallet.mnemonic.phrase);
        }
        console.log("privateKey:", wallet.privateKey);

        const newWallet: Wallet = {
          wallet: wallet.address.toLowerCase(),
          user_id: user.id,
          create_at: getServerTimeStamp(),
          name: ctx.message.text,
          telegram_id: teleUser.id,
          private_key: encrypt(teleUser.id, wallet.privateKey),
          seed_pharse: wallet.mnemonic
            ? encrypt(teleUser.id, wallet.mnemonic.phrase)
            : "",
        };
        const result = await create(
          "wallets",
          null,
          removeUndefined(newWallet)
        );
        await incrementNumericValue("users", user.id, "count_wallets");
        if (result) {
          const strs = [
            Format.fmt`Wallet added:\n`,
            Format.fmt` ${emojs.address} ${Format.bold(
              "Address"
            )}: ${Format.code(wallet.address.toLowerCase())}\n`,
            Format.fmt` ${emojs.name} ${Format.bold("Name")}: ${Format.code(
              ctx.message.text
            )}\n`,
            Format.fmt` ${emojs.key} ${Format.bold(
              "Private key"
            )}: ${Format.spoiler(wallet.privateKey)}\n`,
            Format.fmt` ${emojs.seed} ${Format.bold(
              "Seed pharse"
            )}: ${Format.spoiler(
              wallet.mnemonic ? wallet.mnemonic.phrase : ""
            )}\n`,
          ];
          await reply(ctx, Format.join(strs));
          return ctx.scene.leave();
        } else {
          await reply(
            ctx,
            Format.fmt`Wallet: ${Format.code(ctx.message.text)} add error`
          );
          return ctx.scene.leave();
        }
      } else {
        await reply(
          ctx,
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
    await deleteLastMessage(ctx);
    if (
      ctx.scene.session.state &&
      "idWalletToEdit" in ctx.scene.session.state &&
      ctx.scene.session.state.idWalletToEdit &&
      _.isString(ctx.scene.session.state.idWalletToEdit)
    ) {
      const wallet: any = await getDoc(
        "wallets",
        ctx.scene.session.state.idWalletToEdit
      );
      if (wallet) {
        ctx.scene.session.idWalletToEdit =
          ctx.scene.session.state.idWalletToEdit;
        await reply(
          ctx,
          Format.fmt`Enter new name for wallet?\nAddress: ${Format.code(
            wallet.wallet
          )}`,
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
      await reply(
        ctx,
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
    await deleteLastMessage(ctx);
    if (
      ctx.scene.session.state &&
      "idWalletToDelete" in ctx.scene.session.state &&
      ctx.scene.session.state.idWalletToDelete &&
      _.isString(ctx.scene.session.state.idWalletToDelete)
    ) {
      const _wallet: any = await getDoc(
        "wallets",
        ctx.scene.session.state.idWalletToDelete
      );
      if (_wallet) {
        ctx.scene.session.idWalletToDelete =
          ctx.scene.session.state.idWalletToDelete;
        await reply(
          ctx,
          Format.fmt`Are you sure to delete wallet?\nAddress: ${Format.code(
            _wallet.wallet
          )}\nName:${Format.code(_wallet.name)}`,
          yesOrNoInlineKeyboard
        );
        return ctx.wizard.next();
      } else {
        await reply(ctx, "Wallet not found");
        return ctx.scene.leave();
      }
    } else {
      return ctx.wizard.next();
    }
  }
);


const deleteWLWalletWizard = new Scenes.WizardScene<BotContext>(
  "deleteWLWalletWizard", // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx);
    if (
      ctx.scene.session.state &&
      "idWLWalletToDelete" in ctx.scene.session.state &&
      ctx.scene.session.state.idWLWalletToDelete &&
      _.isString(ctx.scene.session.state.idWLWalletToDelete)
    ) {
      const _wallet: any = await getDoc(
        "wallets_whitelist",
        ctx.scene.session.state.idWLWalletToDelete
      );
      if (_wallet) {
        ctx.scene.session.idWLWalletToDelete =
          ctx.scene.session.state.idWLWalletToDelete;
        await reply(
          ctx,
          Format.fmt`Are you sure to delete wallet?\nAddress: ${Format.code(
            _wallet.wallet
          )}\nName:${Format.code(_wallet.name)}`,
          yesOrNoInlineKeyboard
        );
        return ctx.wizard.next();
      } else {
        await reply(ctx, "Wallet not found");
        return ctx.scene.leave();
      }
    } else {
      return ctx.wizard.next();
    }
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
  await deleteLastMessage(ctx);
  return ctx.scene.leave();
});
editCurrentWalletWizard.action("leave", async (ctx) => {
  await deleteLastMessage(ctx);
  return ctx.scene.leave();
});

editCurrentWalletWizard.action("leave", async (ctx) => {
  return ctx.scene.leave();
});

deleteWLWalletWizard.action("yes", deleteWLWallet);
deleteWLWalletWizard.action("no", async (ctx) => {
  await deleteLastMessage(ctx);
  return ctx.scene.leave();
});


export const walletScenes = [
  // addWalletWizard,
  deleteWalletWizard,
  editWalletWizard,
  createWalletWizard,
  editCurrentWalletWizard,
  deleteCurrentWalletWizard,
  transferWizard,
  addWhiteListWalletWizard,
  editWLWalletWizard,
  deleteWLWalletWizard,
];

//Private method


const processUserInputWLWallet = async (
  ctx: BotContext,
  wallet: string
): Promise<boolean> => {
  const _wallet = wallet.toLowerCase();
  if (isAddress(wallet)) {
    const teleUser = ctx.from;
    if (!teleUser) {
      await reply(ctx, "User not found");
      return false;
    }
    const isWalletExist = await isExists("wallets_whitelist", null, [
      {
        field: "wallet",
        operation: "==",
        value: wallet,
      },
      {
        field: "telegram_id",
        operation: "==",
        value: teleUser.id,
      },
    ]);
    if (!isWalletExist) {
      ctx.scene.session.walletWLAddr = _wallet;
      await reply(ctx, "Please enter name for the wallet", cancelBtnStep1);
      return true;
    } else {
      await reply(ctx, Format.fmt`Wallet: ${Format.code(_wallet)} exists`);
      return false;
    }
  } else {
    await reply(ctx, "Wallet is invalid format!");
    return false;
  }
};


