import { Format, Markup, Scenes, Telegraf } from "telegraf";
import { BotContext, cancelBtn, yesOrNoKeyboardNetwork } from "../context";
import _ from 'lodash'
import { isValidAddOrder } from "./schema";
import { create, deleteDoc, getDoc, getServerTimeStamp, isExists, updateDoc } from "../../libs/firestore";
import { Order } from "./model";
import { isNumeric, removeUndefined } from "../../libs";
import { emojs } from "../../libs/constants2";

export const addOrderWizard = new Scenes.WizardScene<BotContext>(
  "addOrderWizard",
  async (ctx) => {
    await ctx.reply("Please enter the order data");
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      // console.log(ctx.message.text)
      try {
        const orderData = JSON.parse(ctx.message.text);
        if (isValidAddOrder(orderData)) {
          const teleUser = ctx.from
          if (!teleUser) {
            return ctx.reply('User not found')
          }
          const user = await getDoc('users', null, [
            { field: 'telegram_id', operation: '==', value: teleUser.id }
          ])
          if (!user) {
            return ctx.reply('User not found')
          }
          //Check if the wallet address has been configured with the corresponding private key or not.
          const walletAddress = _.get(orderData, 'wallet', null)
          const wallet = await getDoc('wallets', null, [
            { field: 'wallet', operation: '==', value: walletAddress },
            { field: 'telegram_id', operation: '==', value: teleUser.id }
          ])
          if (!wallet) {
            return ctx.reply('Wallet not found')
          }
          const _pri = _.get(process.env, `WALLET_${wallet.id}_PRIVATE_KEY`)
          if (!_pri) {
            return ctx.reply('The wallet has not been configured with the corresponding private key')
          }
          const newOrder: Order = {
            ...orderData,
            user_id: user.id,
            telegram_id: teleUser.id,
            create_at: getServerTimeStamp(),
            is_filled: false,
            transaction_hash: null
          };
          const result = await create(
            "orders",
            null,
            removeUndefined(newOrder)
          );
          if (result) {
            await ctx.reply(Format.fmt`Order added`);
          } else {
            await ctx.reply(Format.fmt`Order add error`);
          }
          return ctx.scene.leave();
        } else {
          await ctx.reply(Format.fmt`The data is not in the correct JSON format`);
          return ctx.scene.leave()
        }
      } catch (error) {
        await ctx.reply(Format.fmt`The data is not in the correct JSON format`);
        return ctx.scene.leave()
      }
    } else {
      ctx.scene.leave();
    }
  },
  async (ctx) => {
    console.log({ ctx })
    await ctx.reply("Done");
    return await ctx.scene.leave();
  }
);

export const getTemplateWizard = new Scenes.WizardScene<BotContext>(
  "getTemplateWizard",
  async (ctx) => {
    const keyboards = Markup.inlineKeyboard([
      Markup.button.callback('Add order', 'get_template_add_order'),
    ])
    await ctx.reply("Select tempalte for: ", keyboards);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      try {
        const orderData = JSON.parse(ctx.message.text);
        if (isValidAddOrder(orderData)) {
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

export const editOrderPriceWizard = new Scenes.WizardScene<BotContext>(
  'editOrderPriceWizard', // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await ctx.reply('What is your order id?');
    ctx.scene.session.idOrderToEdit = ''
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      const order = await getDoc('orders', ctx.message.text)
      if (order) {
        if (_.get(order, 'is_filled', false)) {
          await ctx.reply(Format.fmt`Order can not edit`);
          return ctx.scene.leave()
        } else {
          ctx.scene.session.idOrderToEdit = ctx.message.text
        }
      } else {
        await ctx.reply(Format.fmt`Order not found`);
        return ctx.scene.leave()
      }
    } else {
      return ctx.wizard.next();
    }
    await ctx.reply(Format.fmt`Enter new target price for ${Format.code('address')}`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    console.log(ctx.message)
    if (ctx.message && "text" in ctx.message && ctx.message.text && isNumeric(ctx.message.text)) {
      await updateDoc("orders", ctx.scene.session.idOrderToEdit, { target_price: ctx.message.text })
      await ctx.reply(Format.fmt`Order id ${Format.code(ctx.scene.session.idOrderToEdit)} updated`);
    } else {
      await ctx.reply('Cancel')
    }
    return ctx.scene.leave();
  },
);

export const editOrderAmountWizard = new Scenes.WizardScene<BotContext>(
  'editOrderAmountWizard', // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await ctx.reply('What is your order id?');
    ctx.scene.session.idOrderToEdit = ''
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      const order = await getDoc('orders', ctx.message.text)
      if (order) {
        if (_.get(order, 'is_filled', false)) {
          await ctx.reply(Format.fmt`Order can not edit`);
          return ctx.scene.leave()
        } else {
          ctx.scene.session.idOrderToEdit = ctx.message.text
        }
      } else {
        await ctx.reply(Format.fmt`Order not found`);
        return ctx.scene.leave()
      }
    } else {
      return ctx.wizard.next();
    }
    await ctx.reply(Format.fmt`Enter new amount in for ${Format.code('address')}`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text && isNumeric(ctx.message.text)) {
      await updateDoc("orders", ctx.scene.session.idOrderToEdit, { amount_in: ctx.message.text })
      await ctx.reply(Format.fmt`Order id ${Format.code(ctx.scene.session.idOrderToEdit)} updated`);
    } else {
      await ctx.reply('Cancel')
    }
    return ctx.scene.leave();
  },
);

export const editOrderStatusWizard = new Scenes.WizardScene<BotContext>(
  'editOrderStatusWizard', // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await ctx.reply('What is your order id?');
    ctx.scene.session.idOrderToEdit = ''
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      const order = await getDoc('orders', ctx.message.text)
      if (order) {
        if (_.get(order, 'is_filled', false)) {
          await ctx.reply(Format.fmt`Order can not edit`);
          return ctx.scene.leave()
        } else {
          ctx.scene.session.idOrderToEdit = ctx.message.text
        }
      } else {
        await ctx.reply(Format.fmt`Order not found`);
        return ctx.scene.leave()
      }
    } else {
      return ctx.wizard.next();
    }
    await ctx.reply(Format.fmt`Enter new status for ${Format.code(ctx.message.text)}:\n1: Active\n0: Deactive`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text && isNumeric(ctx.message.text) && (parseInt(ctx.message.text) === 0 || parseInt(ctx.message.text) === 1)) {
      await updateDoc("orders", ctx.scene.session.idOrderToEdit, { is_active: parseInt(ctx.message.text) === 1 ? true : false })
      await ctx.reply(Format.fmt`Order id ${Format.code(ctx.scene.session.idOrderToEdit)} updated`);
    } else {
      await ctx.reply('Cancel')
    }
    return ctx.scene.leave();
  },
);


export const deleteOrderWizard = new Scenes.WizardScene<BotContext>(
  'deleteOrderWizard', // first argument is Scene_ID, same as for BaseScene
  async (ctx) => {
    await ctx.reply('What is your order id?', cancelBtn);
    ctx.scene.session.idOrderToDelete = ''
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      const isOrderExist = await isExists('orders', ctx.message.text)
      if (isOrderExist) {
        ctx.scene.session.idOrderToDelete = ctx.message.text
      }
    } else {
      console.log('afsfsf');
      return ctx.wizard.next();
    }
    await ctx.reply(Format.fmt`Are you sure to delete the order?`, Markup.inlineKeyboard([
      Markup.button.callback(`${emojs.yes} Yes`, "confirm_delete"),
      Markup.button.callback(`${emojs.no} No`, "not_confirm_delete")
    ]));
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      if (ctx.message.text === 'Yes') {
        await deleteDoc("orders", ctx.scene.session.idOrderToDelete)
        await ctx.reply(Format.fmt`Order id ${Format.code(ctx.scene.session.idOrderToDelete)} deleted`, Markup.removeKeyboard());
      } else {
        await ctx.reply('Cancel', Markup.removeKeyboard())
      }
    } else {
      await ctx.reply('Cancel', Markup.removeKeyboard())
    }
    return ctx.scene.leave();
  },
);

deleteOrderWizard.action("leave", async (ctx) => {
  let msgId = null
  if (ctx.callbackQuery.message?.message_id) {
    msgId = ctx.callbackQuery.message?.message_id
  }
  if (msgId) {
    ctx.deleteMessage(ctx.callbackQuery.message?.message_id)
  }
  ctx.scene.reset()
  return await ctx.scene.leave()
})

deleteOrderWizard.action("confirm_delete", async (ctx) => {
  let msgId = null
  if (ctx.callbackQuery.message?.message_id) {
    msgId = ctx.callbackQuery.message?.message_id
  }
  if (msgId) {
    ctx.deleteMessage(ctx.callbackQuery.message?.message_id)
  }
  ctx.scene.reset()
  return await ctx.scene.leave()
})

deleteOrderWizard.action("not_confirm_delete", async (ctx) => {
  let msgId = null
  if (ctx.callbackQuery.message?.message_id) {
    msgId = ctx.callbackQuery.message?.message_id
  }
  if (msgId) {
    ctx.deleteMessage(ctx.callbackQuery.message?.message_id)
  }
  ctx.scene.reset()
  return await ctx.scene.leave()
})


export const setupOrderWizards = (bot: Telegraf<BotContext>) => {
  bot.action('add_order', async (ctx) => ctx.scene.enter('addOrderWizard'))
  bot.action('delete_order', async (ctx) => ctx.scene.enter('deleteOrderWizard'))
}
