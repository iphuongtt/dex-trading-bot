import { Format, Markup, Context } from "telegraf";
import { getDoc, getListDocs } from "../../libs/firestore";
import { deleteLastMessage, deleteMessage, deleteMessages, getCurrentMessageId } from "../util";
import { emojs } from "../../libs/constants2";
import { BotContext } from "../context";

export const listWallets = async (ctx: Context) => {
  const teleUser = ctx.from;
  deleteLastMessage(ctx)
  if (teleUser) {
    //Check if user is exist
    const user = await getDoc("users", null, [
      {
        field: "telegram_id",
        operation: "==",
        value: teleUser.id,
      },
    ]);
    if (user) {
      const wallets = await getListDocs("wallets", [
        { field: "user_id", operation: "==", value: user.id },
      ]);
      if (wallets && wallets.length > 0) {
        const title = Format.bold("Your wallets are:\n");
        const items: any = [
          Format.fmt`-------------------------------------\n`,
        ];
        wallets.forEach((item) => {
          items.push(
            Format.fmt`address: ${Format.code(item.wallet)}\nid: ${Format.code(
              item.id
            )}\nname: ${Format.code(
              item.name || ""
            )}\n-------------------------------------\n`
          );
        });
        await ctx.reply(Format.join([title, ...items]), Markup.inlineKeyboard([
          Markup.button.callback(`${emojs.back} Back`, 'show_wallet_menu')
        ]));
      } else {
        await ctx.reply(`You don't have any wallet`, Markup.inlineKeyboard([
          Markup.button.callback(`${emojs.back} Back`, 'show_wallet_menu')
        ]));
      }
    } else {
      await ctx.reply("User not found", Markup.inlineKeyboard([
        Markup.button.callback(`${emojs.back} Back`, 'show_wallet_menu')
      ]));
    }
  } else {
    await ctx.reply("User not found", Markup.inlineKeyboard([
      Markup.button.callback(`${emojs.back} Back`, 'show_wallet_menu')
    ]));
  }
};

export const getWalletMenus = async (ctx: Context) => {
  await ctx.deleteMessage().catch(e => console.log(e));
  return await ctx.reply(
    "Wallet menu",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("💼 My wallets", "get_my_wallets"),
        Markup.button.callback("➕ Add wallet", "add_wallet"),
      ],
      [
        Markup.button.callback("✏️ Edit wallet", "edit_wallet"),
        Markup.button.callback("❌ Del wallet", "delete_wallet"),
      ],
      [Markup.button.callback('🔙 Back', 'back_to_main_menu')]
    ])
  );
};

export const showWalletMenus = async (ctx: Context) => {
  return ctx.reply(
    "Wallet menu",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("💼 My wallets", "get_my_wallets"),
        Markup.button.callback("➕ Add wallet", "add_wallet"),
      ],
      [
        Markup.button.callback("✏️ Edit wallet", "edit_wallet"),
        Markup.button.callback("❌ Del wallet", "delete_wallet"),
      ],
      [Markup.button.callback('🔙 Back', 'back_to_main_menu')]
    ])
  );
};

/**
 * Delete current message and next number message in delNumberNext param
 * @param ctx
 * @param delNumberNext
 * @returns
 */
export const leaveSceneWallet = async (ctx: BotContext, delNumberNext?: number) => {
  const msgId = getCurrentMessageId(ctx)
  if (msgId) {
    if (delNumberNext && delNumberNext > 0) {
      await deleteMessages(ctx, msgId, delNumberNext)
    } else {
      await deleteMessage(ctx, msgId)
    }
  }
  ctx.scene.reset()
  await ctx.scene.leave()
  return showWalletMenus(ctx)
}

export const leaveSceneWalletStep0 = async (ctx: BotContext) => {
  return leaveSceneWallet(ctx, 0)
}

export const leaveSceneWalletStep1 = async (ctx: BotContext) => {
  return leaveSceneWallet(ctx, 1)
}

export const leaveSceneWalletStep2 = async (ctx: BotContext) => {
  return leaveSceneWallet(ctx, 2)
}

export const leaveSceneWalletStep3 = async (ctx: BotContext) => {
  return leaveSceneWallet(ctx, 3)
}
