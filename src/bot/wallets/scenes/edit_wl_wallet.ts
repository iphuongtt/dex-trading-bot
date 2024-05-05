import { Format, Scenes } from "telegraf";
import { getDoc, updateDoc } from "../../../libs/firestore";
import { deleteLastMessage, reply } from "../../util";
import { BotContext, cancelBtn } from "../../context";
import _ from "lodash";

export const editWLWalletWizard = new Scenes.WizardScene<BotContext>(
  "editWLWalletWizard", // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx);
    if (
      ctx.scene.session.state &&
      "idWLWalletToEdit" in ctx.scene.session.state &&
      ctx.scene.session.state.idWLWalletToEdit &&
      _.isString(ctx.scene.session.state.idWLWalletToEdit)
    ) {
      const wallet: any = await getDoc(
        "wallets_whitelist",
        ctx.scene.session.state.idWLWalletToEdit
      );
      if (wallet) {
        ctx.scene.session.idWLWalletToEdit =
          ctx.scene.session.state.idWLWalletToEdit;
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
      await updateDoc("wallets_whitelist", ctx.scene.session.idWLWalletToEdit, {
        name: ctx.message.text,
      });
      await reply(
        ctx,
        Format.fmt`Wallet address ${Format.code(
          ctx.scene.session.idWLWalletToEdit
        )} updated`
      );
    } else {
      await reply(ctx, "Cancel");
    }
    return ctx.scene.leave();
  }
);

editWLWalletWizard.action("leave", async (ctx) => {
  await deleteLastMessage(ctx);
  return ctx.scene.leave();
});