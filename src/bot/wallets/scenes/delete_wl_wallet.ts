import { Format, Scenes } from "telegraf";
import { BotContext, yesOrNoInlineKeyboard } from "../../context";
import { deleteLastMessage, reply } from "../../util";
import _ from "lodash";
import { getDoc } from "../../../libs/firestore";
import { deleteWLWallet } from "../command";

export const deleteWLWalletWizard = new Scenes.WizardScene<BotContext>(
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

deleteWLWalletWizard.action("yes", deleteWLWallet);
deleteWLWalletWizard.action("no", async (ctx) => {
  await deleteLastMessage(ctx);
  return ctx.scene.leave();
});