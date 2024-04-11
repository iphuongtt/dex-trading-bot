import { ChainId } from '@uniswap/sdk-core';
import express from 'express'
import { Composer, Markup, Scenes, session, Telegraf, Format } from 'telegraf';
import { addTradeSchema, isValid } from './schemas'
const expressApp = express()

const BOT_TOKEN = process.env.BOT_TOKEN
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN
const WEBHOOK_PORT = process.env.WEBHOOK_PORT
const ENV = process.env.ENV || 'local'
if (!BOT_TOKEN) {
    throw new Error('aaa')
}
// if (!BOT_TOKEN || !WEBHOOK_DOMAIN || !WEBHOOK_PORT) {
//     throw new Error('aaa')
// }
expressApp.use(express.static('static'))
expressApp.use(express.json());

// specify generic type of Telegraf context
// thus Typescript will know that ctx.scene exists
const bot = new Telegraf<Scenes.WizardContext>(BOT_TOKEN);

// you can also pass step handlers as Composer
// and attach any methods you need
const stepHandler = new Composer<Scenes.WizardContext>();

const keyboardNetwork = Markup.keyboard([
    [
        Markup.button.callback('Base', 'something')
    ]
]);

const removeKeyboard = Markup.removeKeyboard();


const message1 = Format.link('test', 'https://google.com')



// bot.command('test', async (ctx) => {
//   ctx.reply(message1);
// })
// bot.command('test1', async (ctx) => {
//   ctx.reply('test1', keyboardLang);
// })

// bot.command('test2', async (ctx) => {
//   ctx.reply('test2', removeKeyboard);
// })

stepHandler.command("next", async (ctx) => {
    await ctx.reply("Step 2. Via command");
    return ctx.wizard.next();
});

bot.action('something', async (ctx) => {
    console.log('choseBase')
    await ctx.reply("choseBase");
})




const scene = new Scenes.WizardScene<Scenes.WizardContext>(
    "addTrade",
    async (ctx) => {
        await ctx.reply("Vui lòng nhập dữ liệu giao dịch");
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            // console.log(ctx.message.text)
            const tradeData = ctx.message.text
            console.log(isValid(tradeData))
            if (isValid(tradeData)) {
                await ctx.reply("Done");
                return ctx.scene.leave()
            } else {
                await ctx.reply("Lỗi dữ liệu");
                return ctx.wizard.back()
            }
        } else {
            ctx.wizard.back()
        }

    },
    async (ctx) => {
        await ctx.reply("Done");
        return await ctx.scene.leave();
    }
);



// const contactDataWizard = new Scenes.WizardScene(
//     'Test', // first argument is Scene_ID, same as for BaseScene
//     async (ctx) => {
//       ctx.reply('What is your name?');
//       ctx.wizard.state.contactData = {};
//       return ctx.wizard.next();
//     },
//     async (ctx) => {
//       // validation example
//       if (ctx.message.text.length < 2) {
//         ctx.reply('Please enter name for real');
//         return; 
//       }
//       ctx.wizard.state.contactData.fio = ctx.message.text;
//       ctx.reply('Enter your e-mail');
//       return ctx.wizard.next();
//     },
//     async (ctx) => {
//       ctx.wizard.state.contactData.email = ctx.message.text;
//       ctx.reply('Thank you for your replies, we'll contact your soon');
//       await mySendContactDataMomentBeforeErase(ctx.wizard.state.contactData);
//       return ctx.scene.leave();
//     },
//   );

// to compose all scenes you use Stage
const stage = new Scenes.Stage<Scenes.WizardContext>([scene]);

bot.use(session());
// this attaches ctx.scene to the global context
bot.use(stage.middleware());

// you can enter the scene only AFTER registering middlewares
// otherwise ctx.scene will be undefined
bot.command('addTrade', ctx => ctx.scene.enter('addTrade'));

export const startBot = () => {
    bot.launch()
}