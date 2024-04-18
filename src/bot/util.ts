import { Context } from "telegraf"

export const deleteMessage = async (ctx: Context, msgId: number) => {
  return ctx.deleteMessage(msgId).catch(e => {
    console.log(e)
  })
}