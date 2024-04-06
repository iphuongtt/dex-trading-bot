import { getPrice } from "../libs/pricing";
import {getCurrencyBalance} from '../libs/wallet'
import {CurrentConfig} from '../config'
import JSBI from "jsbi";
import { executeRoute, generateRoute } from "../libs/routing";

var cron = require("node-cron");

export class Swap {
  do = async () => {    
    const balance = await getCurrencyBalance(CurrentConfig.wallet.address, CurrentConfig.tokens.in)
    const bigBalance = JSBI.BigInt(balance);
    const bigZero = JSBI.BigInt(0)
    const bigTarget = JSBI.BigInt(CurrentConfig.tokens.targetPrice)
    if (JSBI.GT(bigBalance, bigZero)) {      
      const price = await getPrice()
      const bigPrice = JSBI.BigInt(price)
      const date = new Date()
      if(JSBI.GE(bigPrice, bigTarget)) {
        //Sell when price >= target price
        const router = await generateRoute()
        if (router) {          
          executeRoute(router)
        }
        
        console.log([date.toLocaleString(), price, bigPrice.toString(), bigTarget.toString()]) 
      }
      
    } else {
      console.log('Balance zero')
      throw new Error('Balance zero')
    }    
  };

  start = async () => {
    cron.schedule("*/1 * * * *", this.do);
  };
}
