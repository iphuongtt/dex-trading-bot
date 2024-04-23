import { Format, Markup, Context } from "telegraf";
import { deleteDoc, getDoc, getListDocs, incrementNumericValue } from "../../libs/firestore";
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
          const strItems = [
            Format.fmt` ${emojs.address} ${Format.bold('Address')}: ${Format.code(item.wallet)}\n`,
            Format.fmt` ${emojs.name} ${Format.bold('Name')}: ${Format.code(item.name)}\n`,
            Format.fmt` ${Format.bold('ID')}: ${Format.code(item.id)}\n`,
          ];
          strItems.push(Format.fmt`-------------------------------------\n`)
          items.push(Format.join(strItems))
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

export const deleteWallet = async (ctx: BotContext) => {
  const teleUser = ctx.from;
  if (!teleUser) {
    await ctx.reply("User not register")
    return ctx.scene.leave();
  }
  deleteLastMessage(ctx)
  const user = await getDoc("users", null, [
    {
      field: "telegram_id",
      operation: "==",
      value: teleUser.id,
    },
  ]);
  if (!user) {
    await ctx.reply("User not register")
    return ctx.scene.leave();
  }
  await deleteDoc("wallets", ctx.scene.session.idWalletToDelete);
  await incrementNumericValue("users", user.id, "count_wallets", -1)
  await ctx.reply(
    Format.fmt`Wallet address ${Format.code(
      ctx.scene.session.idWalletToDelete
    )} deleted`
  );
  ctx.scene.reset();
  return await ctx.scene.leave();
};

export const getWalletMenus = async (ctx: Context) => {
  await ctx.deleteMessage().catch(e => console.log(e));
  return await ctx.reply(
    "Wallet menu",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("💼 My wallets", "get_my_wallets"),
        Markup.button.callback("➕ Create wallet", "create_wallet"),
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
        Markup.button.callback("➕ Create wallet", "create_wallet"),
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
