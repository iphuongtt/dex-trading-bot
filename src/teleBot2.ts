//guide: https://github.com/feathers-studio/telegraf-docs
import { ChainId } from "@uniswap/sdk-core";
import express from "express";
import { Composer, Markup, Scenes, session, Telegraf, Format, Context } from "telegraf";
import {
  addTradeSchema,
  getAddTradeTemplate,
  isValidAddTrade,
} from "./schemas";
import { isAddress } from "ethers-new";
import { create, getDoc, getListDocs, getServerTimeStamp, isExists, updateDoc, deleteDoc } from "./libs/firestore";
import { Wallet } from "./models";
import { removeUndefined } from "./libs";
const expressApp = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN;
const WEBHOOK_PORT = process.env.WEBHOOK_PORT;
const ENV = process.env.ENV || "local";
if (!BOT_TOKEN) {
  throw new Error("aaa");
}
// if (!BOT_TOKEN || !WEBHOOK_DOMAIN || !WEBHOOK_PORT) {
//     throw new Error('aaa')
// }
expressApp.use(express.static("static"));
expressApp.use(express.json());

const yesOrNoKeyboardNetwork = Markup.keyboard([
    [Markup.button.callback("Yes", 'Yes')],
    [Markup.button.callback("No", 'No')],
]);

interface MyWizardSession extends Scenes.WizardSessionData {
    walletAddress: string;
    walletName: string;
    idWalletToDelete: string;
    idWalletToEdit: string;
}
interface MySession extends Scenes.WizardSession<MyWizardSession> {
    mySessionProp: number;
}
interface MyContext extends Context {
    myContextProp: string;
    session: MySession;
    scene: Scenes.SceneContextScene<MyContext, MyWizardSession>;
    wizard: Scenes.WizardContextWizard<MyContext>;
}

// specify generic type of Telegraf context
// thus Typescript will know that ctx.scene exists
const bot = new Telegraf<MyContext>(BOT_TOKEN);

// you can also pass step handlers as Composer
// and attach any methods you need
const stepHandler = new Composer<MyContext>();

const removeKeyboard = Markup.removeKeyboard();

const message1 = Format.link("test", "https://google.com");

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

// const tasks = [{ taskNo: 1, taskName: 'a' }, { taskNo: 2, taskName: 'b' }, { taskNo: 3, taskName: 'c' }]

// function createMessage(tasks: any[]): Format.FmtString<'fmt', string> {
//     let messageArr = fmt`${bold`Test`}`;
//     tasks.forEach((task) => {
//         const message = fmt`${bold`${task.taskNo} ${task.taskName}`}`;
//         messageArr = fmt`${messageArr},${message}`;
//     });
//     console.log(messageArr);
// }

const addTradeWizard = new Scenes.WizardScene<MyContext>(
  "addTrade",
  async (ctx) => {
    await ctx.reply("Vui lòng nhập dữ liệu giao dịch");
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      // console.log(ctx.message.text)
      try {
        const tradeData = JSON.parse(ctx.message.text);
        if (isValidAddTrade(tradeData)) {
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

const addWalletWizard = new Scenes.WizardScene<MyContext>(
    'addWalletWizard', // first argument is Scene_ID, same as for BaseScene
    async (ctx) => {
      await ctx.reply('What is your wallet address?');
      ctx.scene.session.walletAddress = ''
      return ctx.wizard.next();
    },
    async (ctx) => {
      if (ctx.message && "text" in ctx.message) {
        if (isAddress(ctx.message.text)) {
            ctx.scene.session.walletAddress = ctx.message.text
            await ctx.reply('Please enter name for the wallet ');
        } else {
            await ctx.reply('Wallet is invalid format!');
            return ctx.wizard.back();
        }
      }
      return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message && "text" in ctx.message) {
            ctx.scene.session.walletName = ctx.message.text
        }
        await ctx.reply(Format.fmt`Thank you for your replies\n We added ${Format.code(ctx.scene.session.walletAddress)} name ${Format.code(ctx.scene.session.walletName)}`);
        return ctx.scene.leave();
    },
  );

const deleteWalletWizard = new Scenes.WizardScene<MyContext>(
'deleteWalletWizard', // first argument is Scene_ID, same as for BaseScene
    async (ctx) => {
        await ctx.reply('What is your wallet id?');
        ctx.scene.session.idWalletToDelete = ''
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message && "text" in ctx.message && ctx.message.text) {
            const isWalletExist = await isExists('wallets', ctx.message.text)
            if (isWalletExist) {
                ctx.scene.session.idWalletToDelete = ctx.message.text
            }
        } else {
            return ctx.wizard.next();
        }
        await ctx.reply(Format.fmt`Are you sure to delete the wallet? ${Format.code('Yes')} or ${Format.code('No')}`, yesOrNoKeyboardNetwork);
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message && "text" in ctx.message) {
            if (ctx.message.text === 'Yes') {
                await deleteDoc("wallets", ctx.scene.session.idWalletToDelete)
                await ctx.reply(Format.fmt`Wallet address ${Format.code(ctx.scene.session.idWalletToDelete)} deleted`, Markup.removeKeyboard());
            } else {
                await ctx.reply('Cancel', Markup.removeKeyboard())
            }
        } else {
            await ctx.reply('Cancel', Markup.removeKeyboard())
        }
        return ctx.scene.leave();
    },
);

const editWalletWizard = new Scenes.WizardScene<MyContext>(
    'editWalletWizard', // first argument is Scene_ID, same as for BaseScene
        async (ctx) => {
            await ctx.reply('What is your wallet id?');
            ctx.scene.session.idWalletToEdit = ''
            return ctx.wizard.next();
        },
        async (ctx) => {
            if (ctx.message && "text" in ctx.message && ctx.message.text) {
                const wallet = await getDoc('wallets', ctx.message.text)
                if (wallet) {
                    ctx.scene.session.idWalletToEdit = ctx.message.text
                } else {
                    await ctx.reply(Format.fmt`Wallet not found`);
                    return ctx.scene.leave()
                }
            } else {
                return ctx.wizard.next();
            }
            await ctx.reply(Format.fmt`Enter new name for ${Format.code('address')}`);
            return ctx.wizard.next();
        },
        async (ctx) => {
            if (ctx.message && "text" in ctx.message && ctx.message.text) {
                await updateDoc("wallets", ctx.scene.session.idWalletToEdit, {name: ctx.message.text})
                await ctx.reply(Format.fmt`Wallet address ${Format.code(ctx.scene.session.idWalletToEdit)} updated`);
            } else {
                await ctx.reply('Cancel')
            }
            return ctx.scene.leave();
        },
    );

// to compose all scenes you use Stage
const stage = new Scenes.Stage<MyContext>([addTradeWizard, addWalletWizard, deleteWalletWizard, editWalletWizard]);

bot.use(session());
// this attaches ctx.scene to the global context
bot.use(stage.middleware());

// you can enter the scene only AFTER registering middlewares
// otherwise ctx.scene will be undefined
bot.command("addtrade", (ctx) => ctx.scene.enter("addTrade"));
bot.command("addwallet", (ctx) => ctx.scene.enter("addWalletWizard"))
bot.command("deletewallet", (ctx) => ctx.scene.enter("deleteWalletWizard"))
bot.command("editwallet", (ctx) => ctx.scene.enter("editWalletWizard"))

bot.command("start", (ctx) => ctx.reply("👍"));

bot.command("template", (ctx) => {
  const payload = ctx.payload;
  if (payload) {
    switch (payload) {
      case "addtrade":
        ctx.reply(Format.code(getAddTradeTemplate()));
        break;
      default:
        ctx.reply("Template not found");
        break;
    }
  } else {
    ctx.reply("Template not found");
  }
});

bot.command("addwallet2", async (ctx) => {
  const wallet = ctx.payload;
  if (wallet) {
    if (isAddress(wallet)) {
      const teleUser = ctx.from;
      //Check if user is exist
      const user = await getDoc("users", null, [
        {
          field: "telegram_id",
          operation: "==",
          value: teleUser.id,
        },
      ]);
      if (user) {
        //Check if wallet exist
        const isWalletExist = await isExists("wallets", null, [
          { field: "user_id", operation: "==", value: user.id },
          { field: "wallet", operation: "==", value: wallet },
        ]);
        if (!isWalletExist) {
          const newWallet: Wallet = {
            wallet,
            user_id: user.id,
            create_at: getServerTimeStamp(),
            telegram_id: teleUser.id,
          };
          const result = await create(
            "wallets",
            null,
            removeUndefined(newWallet)
          );
          if (result) {
            ctx.reply(Format.fmt`Wallet: ${Format.code(wallet)} added`);
          } else {
            ctx.reply(Format.fmt`Wallet: ${Format.code(wallet)} add error`);
          }
        } else {
          ctx.reply(Format.fmt`Wallet: ${Format.code(wallet)} exists`);
        }
      } else {
        bot.telegram.sendMessage(
          ctx.chat.id,
          `Hello ${teleUser.first_name}!. Welcome to the Mybestcrypto telegram bot.\nI respond to /ethereum. Please try it`,
          {}
        );
      }
      ctx.reply(Format.fmt`Wallet: ${Format.code(wallet)} added`);
    } else {
      ctx.reply("Invalid address");
    }
  } else {
    ctx.reply("Template not found");
  }
});

bot.command('listwallets', async (ctx) => {
    const teleUser = ctx.from;
    //Check if user is exist
    const user = await getDoc("users", null, [
        {
          field: "telegram_id",
          operation: "==",
          value: teleUser.id,
        },
      ]);
    if (user) {
        const wallets = await getListDocs("wallets", [
            { field: "user_id", operation: "==", value: user.id }
        ])
        console.log({wallets})
        if (wallets && wallets.length > 0) {
            const title = Format.bold('Your wallets are:\n')
            const items: any = []
            wallets.forEach(item => {
                items.push(Format.fmt`${Format.code(item.wallet)}\n`)
            })
            ctx.reply(Format.join([title,...items]))
        }
    } else {
        ctx.reply('User not found')
    }
})

bot.command("clear", async (ctx) => {
  let i = 0;
  while (true) {
    try {
      console.log(ctx.message.message_id - i++);
      await ctx.deleteMessage(ctx.message.message_id - i++);
    } catch (e) {
      break;
    }
  }
});

const walletMenus = ["➕ Add wallet", "✏️ Edit wallet", "❌ Del wallet"]
const tradeMenus = [ "➕ Add Trade", "✏️ Edit trade", "❌ Del Trade"]
bot.command('menu', async (ctx) => {
    return await ctx.reply('Mybestcryptos trading bot', Markup.keyboard([
        ["🔍 Wallets", "😎 Trade"], // Row1 with 2 buttons
        [...walletMenus, ...tradeMenus],
    ])
        .oneTime()
        .resize(),
    )
  })

  bot.command("onetime", ctx =>
	ctx.reply(
		"One time keyboard",
		Markup.keyboard(["/simple", "/inline", "/pyramid"]).oneTime().resize(),
	),
);


bot.command("custom", async ctx => {
	return await ctx.reply(
		"Custom buttons keyboard",
		Markup.keyboard([
			["🔍 Search", "😎 Popular"], // Row1 with 2 buttons
			["☸ Setting", "📞 Feedback"], // Row2 with 2 buttons
			["📢 Ads", "⭐️ Rate us", "👥 Share"], // Row3 with 3 buttons
		])
			.oneTime()
			.resize(),
	);
});

bot.hears("🔍 Wallets", async ctx => {
    const teleUser = ctx.from;
    //Check if user is exist
    const user = await getDoc("users", null, [
        {
          field: "telegram_id",
          operation: "==",
          value: teleUser.id,
        },
      ]);
    if (user) {
        const wallets = await getListDocs("wallets", [
            { field: "user_id", operation: "==", value: user.id }
        ])
        if (wallets && wallets.length > 0) {
            const walletMenuKeyBoard = Markup.keyboard([
                walletMenus,
                ["🔙 Back to Menu"]
            ])
            const title = Format.bold('Your wallets are:\n')
            const items: any = [Format.fmt`-------------------------------------\n`]
            wallets.forEach(item => {
                items.push(Format.fmt`address: ${Format.code(item.wallet)}\nid: ${Format.code(item.id)}\nname: ${Format.code(item.name || '')}\n-------------------------------------\n`)
            })
            ctx.reply(Format.join([title,...items]), walletMenuKeyBoard)
        }
    } else {
        ctx.reply('User not found')
    }
});
bot.hears("❌ Del wallet", (ctx) => ctx.scene.enter("deleteWalletWizard"))
bot.hears("✏️ Edit wallet", (ctx) => ctx.scene.enter("editWalletWizard"))
bot.hears("🔙 Back to Menu", async (ctx) => {
    return await ctx.reply('Mybestcryptos trading bot', Markup.keyboard([
        ["🔍 Wallets", "😎 Trade"], // Row1 with 2 buttons
        [...walletMenus, ...tradeMenus],
    ])
        .oneTime()
        .resize(),
    )
})
const commands = [
  { command: "/start", description: "Start using Mybestcryptos trading bot" },
  { command: "/menu", description: "Menu" },
  {
    command: "/addtrade",
    description: "make Jarvis repeat every your message",
  },
  { command: "/template", description: "Get template for command: addtrade" },
  { command: "/addwallet", description: "Add new wallet" },
  { command: "/clear", description: "Clear history chat" },
];

bot.telegram.setMyCommands(commands);
bot.action(/delete_wallet_.+/, ctx => {
	return ctx.answerCbQuery(`Oh, ${ctx.match[0]}! Great choice`);
});

export const startBot = () => {
  bot.launch();
};
