import { Middleware, Scenes } from "telegraf";
import { BotContext } from "../context";
import { reply } from "../util";

export class CommonWizard extends Scenes.WizardScene<BotContext> {
  constructor(id: string, ...steps: Array<Middleware<BotContext>>) {
    super(id)
    this.steps = steps
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
  }
}
