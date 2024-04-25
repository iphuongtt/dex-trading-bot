import { Scenes, Telegraf, session } from "telegraf";
import { BotContext } from "../context";
import { create, getServerTimeStamp, isExists } from "../../libs/firestore";
import { removeUndefined } from "../../libs";
import { backToMainMenu, clearHistory, getMenus } from "./command";
import { orderScenes } from "../orders";
import { walletScenes } from "../wallets";
import { deleteLastMessage } from "../util";
import { User } from "../../models";

export const setupBot = (bot: Telegraf<BotContext>) => {
  const stage = new Scenes.Stage<BotContext>([
    ...orderScenes,
    ...walletScenes
  ]);

  bot.use(session());
  // this attaches ctx.scene to the global context
  bot.use(stage.middleware());

  bot.command("start", async (ctx) => {
    const teleUser = ctx.from;
    //Check user isexist
    const isExist = await isExists("users", null, [
      { field: "telegram_id", operation: "==", value: teleUser.id },
    ]);
    if (!isExist) {
      const newUser: User = {
        telegram_id: teleUser.id,
        username: teleUser.username,
        language_code: teleUser.language_code,
        is_bot: teleUser.is_bot,
        first_name: teleUser.first_name,
        last_name: teleUser.last_name,
        create_at: getServerTimeStamp(),
        is_admin: false,
        is_vip: false,
        count_orders: 0,
        count_wallets: 0
      };
      create("users", null, removeUndefined(newUser)).then((result) => {
        console.log({ result });
        bot.telegram.sendMessage(
          ctx.chat.id,
          `Hello ${teleUser.first_name}! Welcome to the Mybestcrypto telegram bot.`,
          {}
        );
      });
    } else {
      bot.telegram.sendMessage(
        ctx.chat.id,
        `Hello ${teleUser.first_name}!. Welcome to the Mybestcrypto telegram bot.`,
        {}
      );
    }
  });
  //Bot commands
  bot.command("menu", getMenus);
  //Bot listeners
  bot.hears("🔙 Back to Menu", getMenus);
  bot.hears("🧹 Clear histories", clearHistory);
  //Bot Actions
  bot.action("clear_history", clearHistory);
  bot.action("back_to_main_menu", backToMainMenu);
  bot.action("close_menu", ctx => {
    return deleteLastMessage(ctx)
  })
  //Bot starting
  const commands = [
    { command: "/start", description: "Start using Mybestcryptos trading bot" },
    { command: "/menu", description: "Menu" },
    { command: "/myorders", description: "Get my orders" },
  ];
  bot.telegram.setMyCommands(commands);
};
