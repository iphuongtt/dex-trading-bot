import { Format, Scenes } from "telegraf";
import { BotContext, cancelBtn, cancelBtnStep2 } from "../../context";
import { deleteLastMessage, reply } from "../../util";
import { getDoc, updateDoc } from "../../../libs/firestore";
import { leaveSceneWalletStep0, leaveSceneWalletStep2 } from "../command";

export const editWalletWizard = new Scenes.WizardScene<BotContext>(
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

editWalletWizard.action("leave", leaveSceneWalletStep0);
editWalletWizard.action("leave_step_2", leaveSceneWalletStep2);