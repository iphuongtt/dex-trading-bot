import { Format, Markup, Scenes } from "telegraf";
import { BotContext, cancelBtn, yesOrNoKeyboardNetwork } from "../context";
import { isAddress } from "ethers-new";
import { Wallet } from "./model";
import { create, deleteDoc, getDoc, getServerTimeStamp, isExists, updateDoc } from "../../libs/firestore";
import { removeUndefined } from "../../libs";
import { emojs } from "../../libs/constants2";
import { deleteMessage } from "../util";

export const addWalletWizard = new Scenes.WizardScene<BotContext>(
  'addWalletWizard', // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await ctx.reply('What is your wallet address?', cancelBtn);
    ctx.scene.session.walletAddress = ''
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      if (isAddress(ctx.message.text)) {
        const teleUser = ctx.from;
        if (!teleUser) {
          return ctx.reply('User not found')
        }
        const isWalletExist = await isExists('wallets', null, [
          {
            field: 'wallet', operation: '==', value: ctx.message.text
          },
          {
            field: 'telegram_id', operation: '==', value: teleUser.id
          },
        ])
        console.log({ isWalletExist })
        if (!isWalletExist) {
          ctx.scene.session.walletAddress = ctx.message.text
          await ctx.reply('Please enter name for the wallet ');
        } else {
          await ctx.reply(Format.fmt`Wallet: ${Format.code(ctx.message.text)} exists`);
        }
      } else {
        await ctx.reply('Wallet is invalid format!');
        return ctx.wizard.back();
      }
    }
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const teleUser = ctx.from;
      if (!teleUser) {
        return ctx.reply('User not found')
      }
      const user = await getDoc("users", null, [
        {
          field: "telegram_id",
          operation: "==",
          value: teleUser.id,
        },
      ]);
      if (!user) {
        return ctx.reply('User not found')
      }
      ctx.scene.session.walletName = ctx.message.text
      const newWallet: Wallet = {
        wallet: ctx.scene.session.walletAddress,
        user_id: user.id,
        create_at: getServerTimeStamp(),
        name: ctx.message.text,
        telegram_id: teleUser.id,
      };
      const result = await create(
        "wallets",
        null,
        removeUndefined(newWallet)
      );
      if (result) {
        await ctx.reply(Format.fmt`Wallet added:\n
          Address: ${Format.code(ctx.scene.session.walletAddress)}\n
          Name: ${Format.code(ctx.scene.session.walletName)}
        `);
        return ctx.scene.leave();
      } else {
        await ctx.reply(Format.fmt`Wallet: ${Format.code(ctx.message.text)} add error`);
      }
    }
  },
);

export const deleteWalletWizard = new Scenes.WizardScene<BotContext>(
  'deleteWalletWizard', // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await ctx.reply('What is your wallet id?', cancelBtn);
    ctx.scene.session.idWalletToDelete = ''
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      const isWalletExist = await isExists('wallets', ctx.message.text)
      if (isWalletExist) {
        ctx.scene.session.idWalletToDelete = ctx.message.text
      }
    } else {
      return ctx.wizard.next();
    }
    await ctx.reply(Format.fmt`Are you sure to delete the wallet?`, Markup.inlineKeyboard([
      [Markup.button.callback(`${emojs.yes} Yes`, "yes")],
      [Markup.button.callback(`${emojs.no} No`, "no")],
    ]));
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      if (ctx.message.text === 'Yes') {
        await deleteDoc("wallets", ctx.scene.session.idWalletToDelete)
        await ctx.reply(Format.fmt`Wallet address ${Format.code(ctx.scene.session.idWalletToDelete)} deleted`, Markup.removeKeyboard());
      } else {
        await ctx.reply('Cancel', Markup.removeKeyboard())
      }
    } else {
      await ctx.reply('Cancel', Markup.removeKeyboard())
    }
    return ctx.scene.leave();
  },
);

export const editWalletWizard = new Scenes.WizardScene<BotContext>(
  'editWalletWizard', // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await ctx.reply('What is your wallet id?');
    ctx.scene.session.idWalletToEdit = ''
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      const wallet = await getDoc('wallets', ctx.message.text)
      if (wallet) {
        ctx.scene.session.idWalletToEdit = ctx.message.text
      } else {
        await ctx.reply(Format.fmt`Wallet not found`);
        return ctx.scene.leave()
      }
    } else {
      return ctx.wizard.next();
    }
    await ctx.reply(Format.fmt`Enter new name for ${Format.code('address')}`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      await updateDoc("wallets", ctx.scene.session.idWalletToEdit, { name: ctx.message.text })
      await ctx.reply(Format.fmt`Wallet address ${Format.code(ctx.scene.session.idWalletToEdit)} updated`);
    } else {
      await ctx.reply('Cancel')
    }
    return ctx.scene.leave();
  },
);


deleteWalletWizard.action("leave", async (ctx) => {
  let msgId = null
  if (ctx.callbackQuery.message?.message_id) {
    msgId = ctx.callbackQuery.message?.message_id
  }
  if (msgId) {
    await ctx.deleteMessage(ctx.callbackQuery.message?.message_id)
  }
  ctx.scene.reset()
  return await ctx.scene.leave()
})

deleteWalletWizard.action("yes", async (ctx) => {
  let msgId = null
  if (ctx.callbackQuery.message?.message_id) {
    msgId = ctx.callbackQuery.message?.message_id
  }
  if (msgId) {
    await ctx.deleteMessage(ctx.callbackQuery.message?.message_id)
  }
  await deleteDoc("wallets", ctx.scene.session.idWalletToDelete)
  await ctx.reply(Format.fmt`Wallet address ${Format.code(ctx.scene.session.idWalletToDelete)} deleted`);
  ctx.scene.reset()
  return await ctx.scene.leave()
})

deleteWalletWizard.action("no", async (ctx) => {
  let msgId = null
  if (ctx.callbackQuery.message?.message_id) {
    msgId = ctx.callbackQuery.message?.message_id
  }
  if (msgId) {
    await deleteMessage(ctx, msgId)
    await deleteMessage(ctx, msgId - 1)
    await deleteMessage(ctx, msgId - 2)
  }
  ctx.scene.reset()
  return await ctx.scene.leave()
})