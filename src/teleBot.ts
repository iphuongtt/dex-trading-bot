import express from 'express'
import { Telegraf } from 'telegraf'
const expressApp = express()

const BOT_TOKEN = process.env.BOT_TOKEN
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN
const WEBHOOK_PORT = process.env.WEBHOOK_PORT
if (!BOT_TOKEN || !WEBHOOK_DOMAIN || !WEBHOOK_PORT) {
    throw new Error('aaa')
}
expressApp.use(express.static('static'))
expressApp.use(express.json());

export const bot = new Telegraf(BOT_TOKEN);
expressApp.get("/", (req, res) => {
    res.send('Hello')
});

bot.command('start', ctx => {
    console.log(ctx.from)
    bot.telegram.sendMessage(ctx.chat.id, 'Hello there! Welcome to the Mybestcrypto telegram bot.\nI respond to /ethereum. Please try it', {
    })
})
bot.command('ethereum', ctx => {
    var rate;
    console.log(ctx.from)
    bot.telegram.sendMessage(ctx.chat.id, "Hello holder", {})
})


export const startBot = () => {
    console.log( {
        domain: WEBHOOK_DOMAIN,
        port: parseInt(WEBHOOK_PORT)
    })
    
    bot.launch({
        webhook: {
            domain: WEBHOOK_DOMAIN,
            port: parseInt(WEBHOOK_PORT)
        },
    });
}
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));