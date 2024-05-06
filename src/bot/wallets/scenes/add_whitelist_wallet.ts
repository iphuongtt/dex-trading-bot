import { Format, Scenes } from "telegraf";
import { deleteLastMessage, getUserByTeleId, reply } from "../../util";
import { BotContext, cancelBtn, cancelBtnStep1 } from "../../context";
import { isAddress } from "ethers-new";
import { create, getServerTimeStamp, isExists } from "../../../libs/firestore";
import { WalletWhiteList } from "../../../models";
import { removeUndefined } from "../../../libs";
import _ from "lodash";

export const addWhiteListWalletWizard = new Scenes.WizardScene<BotContext>(
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