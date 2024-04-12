import { ChainId } from '@uniswap/sdk-core';
import express from 'express'
import { Composer, Markup, Scenes, session, Telegraf, Format } from 'telegraf';
import { addTradeSchema, getAddTradeTemplate, isValidAddTrade } from './schemas'
import { isAddress } from 'ethers-new'
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

// Format.fmt`${Format.bold`Bold`}, \n ${Format.italic`italic`},\n and ${Format.underline`underline`}!`)


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

// const tasks = [{ taskNo: 1, taskName: 'a' }, { taskNo: 2, taskName: 'b' }, { taskNo: 3, taskName: 'c' }]


// function createMessage(tasks: any[]): Format.FmtString<'fmt', string> {
//     let messageArr = fmt`${bold`Test`}`;
//     tasks.forEach((task) => {
//         const message = fmt`${bold`${task.taskNo} ${task.taskName}`}`;
//         messageArr = fmt`${messageArr},${message}`;
//     });
//     console.log(messageArr);
// }

const scene = new Scenes.WizardScene<Scenes.WizardContext>(
    "addTrade",
    async (ctx) => {
        await ctx.reply("Vui lòng nhập dữ liệu giao dịch");
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            // console.log(ctx.message.text)
            try {
                const tradeData = JSON.parse(ctx.message.text)
                console.log({ tradeData })
                console.log(isValidAddTrade(tradeData))
                if (isValidAddTrade(tradeData)) {
                    await ctx.reply("Done");
                    return ctx.scene.leave()
                } else {
                    await ctx.reply("Lỗi dữ liệu, Vui lòng thực hiện lại");
                    // return ctx.wizard.back()
                }
            } catch (error) {
                await ctx.reply("Dữ liệu không đúng định dạng JSON, Vui lòng thực hiện lại");
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
bot.command('addtrade', ctx => ctx.scene.enter('addTrade'));

bot.command('start', ctx => ctx.reply('👍'))

bot.command('template', ctx => {
    const payload = ctx.payload
    if (payload) {
        switch (payload) {
            case 'addtrade':
                ctx.reply(Format.code(getAddTradeTemplate()))
                break;
            default:
                ctx.reply('Template not found')
                break;
        }
    } else {
        ctx.reply('Template not found')
    }
})

bot.command('addwallet', ctx => {
    const wallet = ctx.payload
    if (wallet) {
        if (isAddress(wallet)) {
            ctx.reply(Format.fmt`Wallet: ${Format.code(wallet)} added`)
        } else {
            ctx.reply('Invalid address')
        }
    } else {
        ctx.reply('Template not found')
    }
})

bot.command('clear', async (ctx) => {
    let i = 0;
    while (true) {
        try {
            await ctx.deleteMessage(ctx.message.message_id - i++);
        } catch (e) {
            break;
        }
    }
})

const commands = [
    { command: '/start', description: 'Start using Mybestcryptos trading bot' },
    { command: '/addtrade', description: 'make Jarvis repeat every your message' },
    { command: '/template', description: 'Get template for command: addtrade' },
    { command: '/addwallet', description: 'Add new wallet' },
    { command: '/clear', description: 'Clear history chat' }
]

bot.telegram.setMyCommands(commands)

export const startBot = () => {
    bot.launch()
}