import { Format, Markup, Scenes } from "telegraf";
import { BotContext } from "../../context";
import { deleteLastMessage, reply } from "../../util";
import { activeOrder, cancleAndClose, deActiveOrder } from "../command";
import { getDoc } from "../../../libs/firestore";
import _ from "lodash";
import { emojs } from "../../../libs/constants2";

export const editOrderStatusWizard = new Scenes.WizardScene<BotContext>(
  "editOrderStatusWizard", // first argument is Scene_ID, same as for BaseScene
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
            Format.fmt`Select new status`,
            Markup.inlineKeyboard([
              [Markup.button.callback(`${emojs.yes} Active`, "active_order"), Markup.button.callback(`${emojs.no} Deactive`, "deactive_order")],
              [Markup.button.callback(`${emojs.cancel} Cancel`, "leave")]
            ]
            ))
          return ctx.wizard.next();
        }
      } else {
        await reply(ctx, Format.fmt`Order not found`);
        return ctx.scene.leave();
      }
    } else {
      return ctx.wizard.next();
    }
  }
);


editOrderStatusWizard.action("leave", cancleAndClose);



editOrderStatusWizard.action("active_order", activeOrder)
editOrderStatusWizard.action("deactive_order", deActiveOrder)
editOrderStatusWizard.action("leave", async (ctx: BotContext) => {
  await deleteLastMessage(ctx)
  return ctx.scene.leave()
})
