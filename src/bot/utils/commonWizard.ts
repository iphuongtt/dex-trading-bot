import { Middleware, Scenes } from "telegraf";
import { BotContext } from "../context";
import { deleteLastMessages, reply } from "../util";

export class CommonWizard extends Scenes.WizardScene<BotContext> {
  constructor(id: string, ...steps: Array<Middleware<BotContext>>) {
    super(id, ...steps)

    this.action("no_action", async (ctx) => {
      return ctx.wizard.back()
    })

    this.action("not_confirm", async (ctx) => {
      await reply(ctx, "Cancel");
      return ctx.scene.leave();
    });

    this.action("cancel", async (ctx) => {
      await reply(ctx, "Cancel");
      return ctx.scene.leave();
    });

    this.action("leave", async (ctx) => {
      return ctx.scene.leave();
    });

    this.action("no", async (ctx) => {
      await reply(ctx, "No");
      return ctx.scene.leave();
    });

    this.action("try_again", async (ctx) => {
      await deleteLastMessages(ctx, 2)
      return ctx.wizard.selectStep(ctx.wizard.cursor - 1)
    });
  }
}
