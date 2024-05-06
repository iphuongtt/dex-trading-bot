import { Format, Scenes } from "telegraf";
import { deleteLastMessage, reply } from "../../util";
import { BotContext, cancelBtn } from "../../context";
import { getDoc, updateDoc } from "../../../libs/firestore";
import _ from "lodash";

export const editCurrentWalletWizard = new Scenes.WizardScene<BotContext>(
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

editCurrentWalletWizard.action("leave", async (ctx) => {
  await deleteLastMessage(ctx);
  return ctx.scene.leave();
});

editCurrentWalletWizard.action("leave", async (ctx) => {
  return ctx.scene.leave();
});