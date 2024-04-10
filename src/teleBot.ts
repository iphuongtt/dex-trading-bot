import express from 'express'
import { Telegraf, Scenes } from 'telegraf'
import { create, getServerTimeStamp, isExists } from './libs/firestore'
import { User } from './models'
import { removeUndefined } from './libs'
const expressApp = express()

const BOT_TOKEN = process.env.BOT_TOKEN
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN
const WEBHOOK_PORT = process.env.WEBHOOK_PORT
const ENV = process.env.ENV || 'local'
if (!BOT_TOKEN || !WEBHOOK_DOMAIN || !WEBHOOK_PORT) {
    throw new Error('aaa')
}
expressApp.use(express.static('static'))
expressApp.use(express.json());

export const bot = new Telegraf(BOT_TOKEN);

expressApp.get("/", (req, res) => {
    res.send('Hello')
});

bot.command('start', async ctx => {
    console.log(ctx)
    console.log(ctx.from)
    const teleUser = ctx.from
    //Check user isexist
    const isExist = await isExists('users', null, [
        { field: "telegram_id", operation: "==", value: teleUser.id }
    ]);
    if (!isExist) {
        const newUser: User = {
            telegram_id: teleUser.id,
            username: teleUser.username,
            language_code: teleUser.language_code,
            is_bot: teleUser.is_bot,
            first_name: teleUser.first_name,
            last_name: teleUser.last_name,
            create_at: getServerTimeStamp(),
            is_admin: false
        }
        create('users', null, removeUndefined(newUser)).then((result) => {
            console.log({ result })
            bot.telegram.sendMessage(ctx.chat.id, `Hello ${teleUser.first_name}! Welcome to the Mybestcrypto telegram bot.\nI respond to /ethereum. Please try it`, {
            })
        })
    } else {
        bot.telegram.sendMessage(ctx.chat.id, `Hello ${teleUser.first_name}!. Welcome to the Mybestcrypto telegram bot.\nI respond to /ethereum. Please try it`, {})
    }
})

bot.command('addTrade', async ctx => {

})

bot.help((ctx) => {
    ctx.reply('Available commands:\n/newarticle - Create a new article');
});

export const startBot = () => {
    console.log({
        domain: WEBHOOK_DOMAIN,
        port: parseInt(WEBHOOK_PORT)
    })
    ENV === 'local' ? bot.launch() :
        bot.launch({
            webhook: {
                domain: WEBHOOK_DOMAIN,
                port: parseInt(WEBHOOK_PORT)
            },
        });
    bot.telegram.sendMessage('473734823', 'your message');
}