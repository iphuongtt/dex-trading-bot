import { Format, Scenes } from "telegraf";
import { deleteWallet, leaveSceneWalletStep0, leaveSceneWalletStep2 } from "../command";
import { BotContext, cancelBtn, yesOrNoInlineKeyboard } from "../../context";
import { deleteLastMessage, reply } from "../../util";
import { isExists } from "../../../libs/firestore";

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

deleteWalletWizard.action("leave", leaveSceneWalletStep0);
deleteWalletWizard.action("yes", deleteWallet);
deleteWalletWizard.action("no", leaveSceneWalletStep2);