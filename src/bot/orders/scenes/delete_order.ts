import { Format } from "telegraf";
import { yesOrNoInlineKeyboard } from "../../context";
import { deleteOrder } from "../command";
import { deleteLastMessage, reply } from "../../util";
import { getDoc } from "../../../libs/firestore";
import _ from "lodash";
import { CommonWizard } from "../../utils";

export const deleteOrderWizard = new CommonWizard(
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
deleteOrderWizard.action("yes", deleteOrder);
