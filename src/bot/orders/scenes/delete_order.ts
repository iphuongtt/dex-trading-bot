import { Format, Scenes } from "telegraf";
import { BotContext, yesOrNoInlineKeyboard } from "../../context";
import { cancleAndClose, deleteOrder } from "../command";
import { deleteLastMessage, reply } from "../../util";
import { getDoc } from "../../../libs/firestore";
import _ from "lodash";

export const deleteOrderWizard = new Scenes.WizardScene<BotContext>(
  "deleteOrderWizard", // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx)
    if (ctx.scene.session.state && "idOrderToDelete" in ctx.scene.session.state && ctx.scene.session.state.idOrderToDelete && _.isString(ctx.scene.session.state.idOrderToDelete)) {
      const _order: any = await getDoc("orders", ctx.scene.session.state.idOrderToDelete)
      if (_order) {
        ctx.scene.session.idOrderToDelete = ctx.scene.session.state.idOrderToDelete;
        await reply(ctx,
          Format.fmt`Are you sure to delete order?`,
          yesOrNoInlineKeyboard
        );
        return ctx.wizard.next();
      } else {
        await reply(ctx, 'Order not found')
        return ctx.scene.leave()
      }
    } else {
      return ctx.wizard.next();
    }
  }
);

deleteOrderWizard.action("leave", cancleAndClose);
deleteOrderWizard.action("yes", deleteOrder);
deleteOrderWizard.action("no", cancleAndClose);
