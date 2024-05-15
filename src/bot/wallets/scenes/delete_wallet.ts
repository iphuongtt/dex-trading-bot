import { Format } from "telegraf";
import { deleteWallet } from "../command";
import { cancelBtn, yesOrNoInlineKeyboard } from "../../context";
import { deleteLastMessage, reply } from "../../util";
import { isExists } from "../../../libs/firestore";
import { CommonWizard } from "../../utils";

const deleteWalletWizard = new CommonWizard(
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
deleteWalletWizard.action("yes", deleteWallet);
