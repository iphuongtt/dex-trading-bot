import { Format, Markup, Scenes } from "telegraf";
import { MyContext } from "./context";
import { isValidAddTrade } from "../schemas";

export const addTradeWizard = new Scenes.WizardScene<MyContext>(
  "addTrade",
  async (ctx) => {
    await ctx.reply("Vui lòng nhập dữ liệu giao dịch");
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      // console.log(ctx.message.text)
      try {
        const tradeData = JSON.parse(ctx.message.text);
        if (isValidAddTrade(tradeData)) {
          await ctx.reply("Done");
          return ctx.scene.leave();
        } else {
          await ctx.reply("Lỗi dữ liệu, Vui lòng thực hiện lại");
          return ctx.wizard.back()
        }
      } catch (error) {
        await ctx.reply(Format.fmt`Dữ liệu không đúng định dạng JSON, Vui lòng thực hiện lại hoặc sử dụng lệnh /gettemplate để lây template`);
        return ctx.wizard.back()
      }
    } else {
      ctx.wizard.back();
    }
  },
  async (ctx) => {
    await ctx.reply("Done");
    return await ctx.scene.leave();
  }
);

export const getTemplateWizard = new Scenes.WizardScene<MyContext>(
  "getTemplateWizard",
  async (ctx) => {
    const keyboards = Markup.inlineKeyboard([
      Markup.button.callback('Add trade', 'get_template_add_trade'),
    ])
    await ctx.reply("Select tempalte for: ", keyboards);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      try {
        const tradeData = JSON.parse(ctx.message.text);
        if (isValidAddTrade(tradeData)) {
          await ctx.reply("Done");
          return ctx.scene.leave();
        } else {
          await ctx.reply("Lỗi dữ liệu, Vui lòng thực hiện lại");
          return ctx.wizard.back()
        }
      } catch (error) {
        await ctx.reply(Format.fmt`Dữ liệu không đúng định dạng JSON, Vui lòng thực hiện lại hoặc sử dụng lệnh /gettemplate để lây template`);
        return ctx.wizard.back()
      }
    } else {
      ctx.wizard.back();
    }
  },
  async (ctx) => {
    await ctx.reply("Done");
    return await ctx.scene.leave();
  }
);
