import { Wallet, isAddress } from "ethers-new";
import { create, getDoc, getServerTimeStamp, isExists } from "../../../libs/firestore";
import { deleteLastMessage, reply } from "../../util";
import { removeUndefined } from "../../../libs";
import { Format, Scenes } from "telegraf";
import { BotContext, cancelBtn, cancelBtnStep1 } from "../../context";
import { leaveSceneWalletStep0, leaveSceneWalletStep1 } from "../command";

export const addWalletWizard = new Scenes.WizardScene<BotContext>(
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

addWalletWizard.action("leave", leaveSceneWalletStep0);
addWalletWizard.action("leave_step_1", leaveSceneWalletStep1);