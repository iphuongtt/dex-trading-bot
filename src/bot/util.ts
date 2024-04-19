import { Context } from "telegraf"
import { BotContext } from "./context"
import { showWalletMenus } from "./wallets"

export const deleteMessage = async (ctx: Context, msgId: number) => {
  return ctx.deleteMessage(msgId).catch(e => {
    console.log(e)
  })
}

export const getCurrentMessageId = (ctx: Context): number | null => {
  let msgId = null
  if (ctx.message && ctx.message.message_id) {
    msgId = ctx.message.message_id
  } else if (ctx.callbackQuery?.message?.message_id) {
    msgId = ctx.callbackQuery.message.message_id
  }
  return msgId
}


export const deleteMessages = async (ctx: Context, msgId: number, numDelNext: number = 0) => {
  if (numDelNext > 0) {
    await deleteMessage(ctx, msgId)
    let _countDel = 1;
    while (_countDel <= numDelNext) {
      await deleteMessage(ctx, msgId - _countDel)
      _countDel++
    }
  } else {
    return deleteMessage(ctx, msgId)
  }
}


export const leaveScene = async (ctx: BotContext) => {
  const msgId = getCurrentMessageId(ctx)
  if (msgId) {
    await deleteMessage(ctx, msgId)
  }
  ctx.scene.reset()
  return ctx.scene.leave()
}

export const leaveSceneStep1 = async (ctx: BotContext) => {
  const msgId = getCurrentMessageId(ctx)
  if (msgId) {
    await deleteMessages(ctx, msgId, 1)
  }
  ctx.scene.reset()
  return ctx.scene.leave()
}

export const leaveSceneStep2 = async (ctx: BotContext) => {
  const msgId = getCurrentMessageId(ctx)
  if (msgId) {
    await deleteMessages(ctx, msgId, 2)
  }
  ctx.scene.reset()
  return ctx.scene.leave()
}

export const leaveSceneStep3 = async (ctx: BotContext) => {
  const msgId = getCurrentMessageId(ctx)
  if (msgId) {
    await deleteMessages(ctx, msgId, 3)
  }
  ctx.scene.reset()
  return ctx.scene.leave()
}

export const leaveSceneStep4 = async (ctx: BotContext) => {
  const msgId = getCurrentMessageId(ctx)
  if (msgId) {
    await deleteMessages(ctx, msgId, 4)
  }
  ctx.scene.reset()
  return ctx.scene.leave()
}

export const deleteLastMessage = async (ctx: Context) => {
  const msgId = getCurrentMessageId(ctx);
  if (msgId) {
    return deleteMessage(ctx, msgId)
  }
}


export const leaveSceneWallet = async (ctx: BotContext) => {
  const msgId = getCurrentMessageId(ctx)
  if (msgId) {
    await deleteMessage(ctx, msgId)
  }
  ctx.scene.reset()
  await ctx.scene.leave()
  return showWalletMenus(ctx)
}
