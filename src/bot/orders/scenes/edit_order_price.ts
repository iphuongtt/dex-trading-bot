import { Format, Scenes } from "telegraf";
import { BotContext, cancelBtn } from "../../context";
import { deleteLastMessage, reply } from "../../util";
import { getDoc, updateDoc } from "../../../libs/firestore";
import _ from "lodash";
import { isNumeric } from "../../../libs";
import { cancleAndClose } from "../command";

export const editOrderPriceWizard = new Scenes.WizardScene<BotContext>(
  "editOrderPriceWizard", // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx)
    if (ctx.scene.session.state && "idOrderToEdit" in ctx.scene.session.state && ctx.scene.session.state.idOrderToEdit && _.isString(ctx.scene.session.state.idOrderToEdit)) {
      const order: any = await getDoc("orders", ctx.scene.session.state.idOrderToEdit);
      if (order) {
        if (_.get(order, "is_filled", false)) {
          await reply(ctx, Format.fmt`Order filled, so you can't edit.`);
          return ctx.scene.leave();
        } else {
          ctx.scene.session.idOrderToEdit = ctx.scene.session.state.idOrderToEdit;
          await reply(ctx,
            Format.fmt`Enter new target price:`,
            cancelBtn
          );
          return ctx.wizard.next();
        }
      } else {
        await reply(ctx, Format.fmt`Order not found`);
        return ctx.scene.leave();
      }
    } else {
      return ctx.wizard.next();
    }
  },
  async (ctx) => {
    console.log(ctx.message);
    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text &&
      isNumeric(ctx.message.text)
    ) {
      await updateDoc("orders", ctx.scene.session.idOrderToEdit, {
        target_price: ctx.message.text,
      });
      await reply(ctx,
        Format.fmt`Order id ${Format.code(
          ctx.scene.session.idOrderToEdit
        )} updated`
      );
    } else {
      await reply(ctx, "Cancel");
    }
    return ctx.scene.leave();
  }
);

editOrderPriceWizard.action("leave", cancleAndClose);
