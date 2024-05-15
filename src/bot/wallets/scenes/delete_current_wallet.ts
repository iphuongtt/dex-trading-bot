import { Format } from "telegraf";
import { deleteLastMessage, reply } from "../../util";
import { deleteWallet } from "../command";
import { yesOrNoInlineKeyboard } from "../../context";
import { getDoc } from "../../../libs/firestore";
import _ from "lodash";
import { CommonWizard } from "../../utils";

export const deleteCurrentWalletWizard = new CommonWizard(
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

deleteCurrentWalletWizard.action("yes", deleteWallet);
