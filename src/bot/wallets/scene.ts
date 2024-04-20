import { Format, Scenes } from "telegraf";
import { BotContext, cancelBtn, cancelBtnStep1, cancelBtnStep2, yesOrNoInlineKeyboard } from "../context";
import { isAddress } from "ethers-new";
import { Wallet } from "./model";
import { create, deleteDoc, getDoc, getServerTimeStamp, isExists, updateDoc } from "../../libs/firestore";
import { removeUndefined } from "../../libs";
import { deleteLastMessage, deleteMessage, getCurrentMessageId } from "../util";
import { leaveSceneWalletStep1, leaveSceneWalletStep2, leaveSceneWalletStep0 } from "./command";

export const addWalletWizard = new Scenes.WizardScene<BotContext>(
  'addWalletWizard', // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx);
    await ctx.reply('Please enter the wallet address', cancelBtn);
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
        if (!isWalletExist) {
          ctx.scene.session.walletAddress = ctx.message.text
          await ctx.reply('Please enter name for the wallet', cancelBtnStep1);
        } else {
          await ctx.reply(Format.fmt`Wallet: ${Format.code(ctx.message.text)} exists`);
          return ctx.scene.leave();
        }
      } else {
        await ctx.reply('Wallet is invalid format!');
        return ctx.scene.leave();
      }
    }
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const teleUser = ctx.from;
      if (!teleUser) {
        await ctx.reply('User not found')
        return ctx.scene.leave();
      }
      const user = await getDoc("users", null, [
        {
          field: "telegram_id",
          operation: "==",
          value: teleUser.id,
        },
      ]);
      if (!user) {
        await ctx.reply('User not found')
        return ctx.scene.leave();
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
        await ctx.reply(Format.fmt`Wallet added:\nAddress: ${Format.code(ctx.scene.session.walletAddress)}\nName: ${Format.code(ctx.scene.session.walletName)}`);
        return ctx.scene.leave();
      } else {
        await ctx.reply(Format.fmt`Wallet: ${Format.code(ctx.message.text)} add error`);
        return ctx.scene.leave();
      }
    }
  },
);

export const deleteWalletWizard = new Scenes.WizardScene<BotContext>(
  'deleteWalletWizard', // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx);
    await ctx.reply('Please enter the wallet ID that you want to delete', cancelBtn);
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
    await ctx.reply(Format.fmt`Are you sure to delete the wallet?`, yesOrNoInlineKeyboard);
    return ctx.wizard.next();
  }
);

export const editWalletWizard = new Scenes.WizardScene<BotContext>(
  'editWalletWizard', // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await deleteLastMessage(ctx);
    await ctx.reply('Please enter the wallet ID that you want to edit', cancelBtn);
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
    await ctx.reply(Format.fmt`Enter new name for ${Format.code('address')}`, cancelBtnStep2);
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

addWalletWizard.action("leave", leaveSceneWalletStep0)
addWalletWizard.action("leave_step_1", leaveSceneWalletStep1)
editWalletWizard.action("leave", leaveSceneWalletStep0)
editWalletWizard.action("leave_step_2", leaveSceneWalletStep2)
deleteWalletWizard.action("leave", leaveSceneWalletStep0)
deleteWalletWizard.action("yes", async (ctx) => {
  const msgId = getCurrentMessageId(ctx)
  if (msgId) {
    await deleteMessage(ctx, msgId)
  }
  await deleteDoc("wallets", ctx.scene.session.idWalletToDelete)
  await ctx.reply(Format.fmt`Wallet address ${Format.code(ctx.scene.session.idWalletToDelete)} deleted`);
  ctx.scene.reset()
  return await ctx.scene.leave()
})

deleteWalletWizard.action("no", leaveSceneWalletStep2)
