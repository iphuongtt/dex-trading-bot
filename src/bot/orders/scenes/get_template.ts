import { Markup, Scenes } from "telegraf";
import { BotContext } from "../../context";
import { deleteLastMessage, reply } from "../../util";
import { emojs } from "../../../libs/constants2";

export const getTemplateWizard = new Scenes.WizardScene<BotContext>(
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
