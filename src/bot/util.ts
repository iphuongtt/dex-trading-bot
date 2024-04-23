import { Context } from "telegraf"
import { BotContext } from "./context"
import CryptoJS from 'crypto-js'
import { User } from "./utils"

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

export const encrypt = (telegram_id: number, txt: string): string => {
  const _secret = process.env.TTP_EN_KEY
  if (!_secret) {
    throw new Error('Encrypt key not found')
  }
  if (!telegram_id) {
    throw new Error('User id not found')
  }
  const key = `KEYKEYKEY${telegram_id}_${_secret}`
  return CryptoJS.AES.encrypt(txt, key).toString()
}

export const decrypt = (telegram_id: number, code: string): string => {
  const _secret = process.env.TTP_EN_KEY
  if (!_secret) {
    throw new Error('Encrypt key not found')
  }
  if (!telegram_id) {
    throw new Error('User id not found')
  }
  const key = `KEYKEYKEY${telegram_id}_${_secret}`
  return CryptoJS.AES.decrypt(code, key).toString(CryptoJS.enc.Utf8)
}

export const isVIP = (user: User): boolean => {
  return user.is_vip || user.is_admin
}
