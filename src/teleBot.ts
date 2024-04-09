import express from 'express'
import { Telegraf, Markup, session, Context, Scenes, Composer } from 'telegraf'
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

interface SessionData {
    yourProp: number;
}

interface MyContext extends Context {
    // will be availbale globally under ctx.myCtxProp
    myCtxProp: string;

    scene: Scenes.SceneContextScene<MyContext, Scenes.WizardSessionData>;

    wizard: Scenes.WizardContextWizard<MyContext>;
}

const stepHandler = new Composer<MyContext>();

const scene = new Scenes.WizardScene<MyContext>("sceneId", stepHandler);
const stage = new Scenes.Stage<MyContext>([scene]);

const bot = new Telegraf<MyContext>(BOT_TOKEN);




bot.use(session());
// this attaches ctx.scene to the global context
bot.use(stage.middleware());

// you can enter the scene only AFTER registering middlewares
// otherwise ctx.scene will be undefined
bot.command("enterScene", async (ctx) => await ctx.scene.enter("sceneId"));

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
/*
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

const invoice = {
  provider_token: 'test',
  start_parameter: "time-machine-sku",
  title: "Working Time Machine",
  description:
      "Want to visit your great-great-great-grandparents? Make a fortune at the races? Shake hands with Hammurabi and take a stroll in the Hanging Gardens? Order our Working Time Machine today!",
  currency: "usd",
  photo_url:
      "https://img.clipartfest.com/5a7f4b14461d1ab2caaa656bcee42aeb_future-me-fredo-and-pidjin-the-webcomic-time-travel-cartoon_390-240.png",
  is_flexible: true,
  prices: [
      { label: "Working Time Machine", amount: 4200 },
      { label: "Gift wrapping", amount: 1000 },
  ],
  payload: JSON.stringify({
      coupon: "BLACK FRIDAY",
  }),
};

const shippingOptions = [
  {
      id: "unicorn",
      title: "Unicorn express",
      prices: [{ label: "Unicorn", amount: 2000 }],
  },
  {
      id: "slowpoke",
      title: "Slowpoke mail",
      prices: [{ label: "Slowpoke", amount: 100 }],
  },
];

const replyOptions = Markup.inlineKeyboard([
  Markup.button.pay("💸 Buy"),
  Markup.button.url("❤️", "http://telegraf.js.org"),
]);

bot.on('sticker', async (ctx) => await ctx.reply('👍'));


bot.use(session());

bot.on("message", async (ctx) => {
  ctx.session ??= { yourProp: 1 };
  await ctx.reply('' + ctx.session.yourProp);
});


export const startBot = () => {
  console.log( {
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
}
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

*/