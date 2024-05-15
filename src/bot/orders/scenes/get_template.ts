import { Markup } from "telegraf";
import { deleteLastMessage, reply } from "../../util";
import { emojs } from "../../../libs/constants2";
import { CommonWizard } from "../../utils";

export const getTemplateWizard = new CommonWizard(
  "getTemplateWizard",
  async (ctx) => {
    await deleteLastMessage(ctx);
    const keyboards = Markup.inlineKeyboard([
      [Markup.button.callback("Add order", "get_template_add_order")],
      [Markup.button.callback(`${emojs.cancel} Cancel`, "leave")],
    ]);
    await reply(ctx, "Select tempalte for: ", keyboards);
    return ctx.scene.leave();
  }
);
