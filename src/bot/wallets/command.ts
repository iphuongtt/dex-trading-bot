import { Format, Markup, Context } from "telegraf";
import { deleteDoc, getDoc, getListDocs, incrementNumericValue } from "../../libs/firestore";
import { decrypt, deleteLastMessage, deleteMessage, deleteMessages, getCurrentMessageId, getUserByTeleId, reply } from "../util";
import { emojs } from "../../libs/constants2";
import { BotContext, closeBtn } from "../context";

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
            Format.fmt`${emojs.view} View: /view_wl_${item.id}\n`,
            Format.fmt`${emojs.edit} Edit: /edit_wl_${item.id}\n`,
            Format.fmt`${emojs.del} Delete: /delete_wl_${item.id}\n`
          ];
          strItems.push(Format.fmt`-------------------------------------\n`)
          items.push(Format.join(strItems))
        });
        await reply(ctx, Format.join([title, ...items]), Markup.inlineKeyboard([
          Markup.button.callback(`${emojs.back} Back`, 'show_wallet_menu')
        ]));
      } else {
        await reply(ctx, `You don't have any wallet`, Markup.inlineKeyboard([
          Markup.button.callback(`${emojs.back} Back`, 'show_wallet_menu')
        ]));
      }
    } else {
      await reply(ctx, "User not found", Markup.inlineKeyboard([
        Markup.button.callback(`${emojs.back} Back`, 'show_wallet_menu')
      ]));
    }
  } else {
    await reply(ctx, "User not found", Markup.inlineKeyboard([
      Markup.button.callback(`${emojs.back} Back`, 'show_wallet_menu')
    ]));
  }
};

export const deleteWallet = async (ctx: BotContext) => {
  const teleUser = ctx.from;
  if (!teleUser) {
    await reply(ctx, "User not register")
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
    await reply(ctx, "User not register")
    return ctx.scene.leave();
  }
  await deleteDoc("wallets", ctx.scene.session.idWalletToDelete);
  await incrementNumericValue("users", user.id, "count_wallets", -1)
  await reply(ctx,
    Format.fmt`Wallet address ${Format.code(
      ctx.scene.session.idWalletToDelete
    )} deleted`
  );
  ctx.scene.reset();
  return await ctx.scene.leave();
};

export const getWalletMenus = async (ctx: Context) => {
  await ctx.deleteMessage().catch(e => console.log(e));
  return await reply(ctx,
    "Wallet menu",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("💼 My wallets", "get_my_wallets"),
        Markup.button.callback("💼 My whitelist wallets", "get_my_wl_wallets"),
      ],
      [
        Markup.button.callback("➕ Create wallet", "create_wallet"),
        Markup.button.callback("Transfer token", "transfer_token"),
      ],
      [Markup.button.callback('🔙 Back', 'back_to_main_menu')]
    ])
  );
};

export const viewDetailWallet = async (ctx: Context, walletId: string) => {
  deleteLastMessage(ctx)
  const teleUser = ctx.from;
  if (!teleUser) {
    return reply(ctx, "User not register", closeBtn)
  }
  const user = await getDoc("users", null, [
    {
      field: "telegram_id",
      operation: "==",
      value: teleUser.id,
    },
  ]);
  if (!user) {
    return reply(ctx, "User not register", closeBtn)
  }
  if (walletId) {
    const _wallet: any = await getDoc("wallets", walletId);
    if (_wallet) {
      let _private_key = 'null'
      let _seed_pharse = 'null'
      try {
        _private_key = _wallet.private_key ? decrypt(teleUser.id, _wallet.private_key) : 'null'
        _seed_pharse = _wallet.seed_pharse ? decrypt(teleUser.id, _wallet.seed_pharse) : 'null'
      } catch (error) { }
      const strItems = [
        Format.fmt`Your wallet info:\n`,
        Format.fmt` ${emojs.address} ${Format.bold('Address')}: ${Format.code(_wallet.wallet)}\n`,
        Format.fmt` ${emojs.name} ${Format.bold('Name')}: ${Format.code(_wallet.name)}\n`,
        Format.fmt` ${emojs.key} ${Format.bold('Private key')}: ${Format.spoiler(_private_key)}\n`,
        Format.fmt` ${emojs.seed} ${Format.bold('Seed pharse')}: ${Format.spoiler(_seed_pharse)}\n`,
        Format.fmt` ${Format.bold('ID')}: ${Format.code(_wallet.id)}\n`,
      ];
      return reply(ctx, Format.join(strItems), closeBtn)
    } else {
      return reply(ctx, 'Wallet not found', closeBtn)
    }
  }
  return reply(ctx, 'Wallet not found', closeBtn)
};

export const showWalletMenus = async (ctx: Context) => {
  return reply(ctx,
    "Wallet menu",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("💼 My wallets", "get_my_wallets"),
        Markup.button.callback("➕ Create wallet", "create_wallet"),
      ],
      [
        Markup.button.callback("Transfer token", "transfer_token"),
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

export const listWLWallets = async (ctx: Context) => {
  const teleUser = ctx.from;
  deleteLastMessage(ctx)
  if (teleUser) {
    //Check if user is exist
    const user = await getUserByTeleId(teleUser.id)
    if (user) {
      const wallets = await getListDocs("wallets_whitelist", [
        { field: "user_id", operation: "==", value: user.id },
      ]);
      if (wallets && wallets.length > 0) {
        const title = Format.bold("Your whitelist wallets are:\n");
        const items: any = [
          Format.fmt`-------------------------------------\n`,
        ];
        wallets.forEach((item) => {
          const strItems = [
            Format.fmt` ${emojs.address} ${Format.bold('Address')}: ${Format.code(item.wallet)}\n`,
            Format.fmt` ${emojs.name} ${Format.bold('Name')}: ${Format.code(item.name)}\n`,
            Format.fmt`${emojs.edit} Edit: /edit_wlwl_${item.id}\n`,
            Format.fmt`${emojs.del} Delete: /delete_wlwl_${item.id}\n`
          ];
          strItems.push(Format.fmt`-------------------------------------\n`)
          items.push(Format.join(strItems))
        });
        await reply(ctx, Format.join([title, ...items]), Markup.inlineKeyboard([
          Markup.button.callback(`${emojs.back} Back`, 'show_wallet_menu')
        ]));
      } else {
        await reply(ctx, `You don't have any wallet`, Markup.inlineKeyboard([
          Markup.button.callback(`${emojs.back} Back`, 'show_wallet_menu')
        ]));
      }
    } else {
      await reply(ctx, "User not found", Markup.inlineKeyboard([
        Markup.button.callback(`${emojs.back} Back`, 'show_wallet_menu')
      ]));
    }
  } else {
    await reply(ctx, "User not found", Markup.inlineKeyboard([
      Markup.button.callback(`${emojs.back} Back`, 'show_wallet_menu')
    ]));
  }
};

export const deleteWLWallet = async (ctx: BotContext) => {
  const teleUser = ctx.from;
  if (!teleUser) {
    await reply(ctx, "User not register")
    return ctx.scene.leave();
  }
  deleteLastMessage(ctx)
  const user = await getUserByTeleId(teleUser.id)
  if (!user) {
    await reply(ctx, "User not register")
    return ctx.scene.leave();
  }
  await deleteDoc("wallets_whitelist", ctx.scene.session.idWLWalletToDelete);
  await incrementNumericValue("users", user.id, "count_wallets_wl", -1)
  await reply(ctx,
    Format.fmt`Wallet address ${Format.code(
      ctx.scene.session.idWLWalletToDelete
    )} deleted`
  );
  ctx.scene.reset();
  return await ctx.scene.leave();
};