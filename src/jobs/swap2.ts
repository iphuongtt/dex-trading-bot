import { UserSwap } from "../libs/userSwap";
import { getListDocs } from "../libs/firestore";
import { Telegraf } from "telegraf";
import { BotContext } from "../bot";
import { Order } from "../models";


let cron = require("node-cron");

export class Swap2 {
  bot: Telegraf<BotContext>
  constructor(bot: Telegraf<BotContext>) {
    this.bot = bot
  }

  async executeTrade(order: Order) {
    const { wallet, chain, target_price, amount, base_token, quote_token, user_id, telegram_id, id, wallet_id } = order
    if (!telegram_id) {
      return false
    }
    if (!wallet || !chain || !target_price || !amount || !base_token || !quote_token || !user_id || !id || !wallet_id) {
      this.bot.telegram.sendMessage(telegram_id, 'Order not valid').catch(e => console.log(e))
      return false
    }
    try {
      const userSwap = new UserSwap(id, wallet_id, chain, base_token, quote_token, user_id, wallet, amount, target_price, this.bot, telegram_id)
      const isOk = await userSwap.setup();
      if (isOk) {
        userSwap.executeSwap()
      }
    } catch (error: any) {
      this.bot.telegram.sendMessage(telegram_id, error.message).catch(e => console.log(e))
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
