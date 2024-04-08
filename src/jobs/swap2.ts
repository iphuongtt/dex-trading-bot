import JSBI from "jsbi";
import { executeSwap, getPrice, getSwap2CurrencyBalance } from "../libs/swap2";
import { destToken, sourceToken, targetPrice, walletAddress } from "../libs/constants2";
import { convertTargetPrice } from "../libs/conversion";

var cron = require("node-cron");

export class Swap2 {
  private isDone: boolean = false
  do = async () => {
    if(this.isDone) {
      console.log('Done')
      throw new Error('Done')
    }
    if (!walletAddress) {
      console.log('Wallet not found')
      throw new Error('error')
    }

    const balance = await getSwap2CurrencyBalance(
      walletAddress,
      sourceToken
    );
    console.log({balance:balance.toString()})
    const bigZero = JSBI.BigInt(0);
    const bigTarget = JSBI.BigInt(convertTargetPrice(targetPrice, destToken.decimals));            
    if (JSBI.GT(balance, bigZero)) {
      const price = await getPrice();      
      if (price) {
        const date = new Date();
        if (JSBI.GE(price, bigTarget)) {
          //Sell when price >= target price
          const swapResult = await executeSwap()
          if (swapResult) {
            this.isDone = true
          }          
        }
      }
    } else {
      console.log("Balance zero");
      throw new Error("Balance zero");
    }
  };

  start = async () => {
    cron.schedule("*/1 * * * *", this.do);
  };
}