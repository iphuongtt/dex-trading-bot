import { UserSwap } from "../libs/userSwap";
import { getListDocs } from "../libs/firestore";
import { Order } from "../bot/orders";
import { Telegraf } from "telegraf";
import { BotContext } from "../bot";


var cron = require("node-cron");

export class Swap2 {
  bot: Telegraf<BotContext>
  constructor(bot: Telegraf<BotContext>) {
    this.bot = bot
  }

  async executeTrade(order: Order) {
    const { wallet, chain, target_price, amount_in, token_in, token_out, user_id, telegram_id } = order
    console.log({ order })
    try {
      const userSwap = new UserSwap(chain, token_in, token_out, user_id, wallet, amount_in, target_price, this.bot, telegram_id)
      const isOk = await userSwap.setup();
      if (isOk) {
        console.log('OK')
        // userSwap.executeSwap()
      }
    } catch (error) {
      console.log(error)
    }

  }

  do = async () => {
    //Get all order
    const orders = await getListDocs("orders", [
      {
        field: 'is_active', operation: '==', value: true
      },
      {
        field: 'is_filled', operation: '==', value: false
      }
    ])
    orders.map(order => this.executeTrade(order))
  };

  start = async () => {
    cron.schedule("*/1 * * * *", this.do);
  };
}
