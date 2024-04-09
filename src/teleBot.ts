import {Telegraf} from 'telegraf'

const BOT_TOKEN = process.env.BOT_TOKEN
if (!BOT_TOKEN) {
    throw new Error('No bo token')
}
const bot = new Telegraf(BOT_TOKEN)
export const startBot = () => {    
    bot.start((ctx) => ctx.reply('Welcome'))
    bot.help((ctx) => ctx.reply('Send me a sticker'))
    bot.hears('hi', (ctx) => ctx.reply('Hey there'))
    bot.launch() // Default long-polling mode
}