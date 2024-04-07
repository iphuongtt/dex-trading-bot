import JSBI from "jsbi";
import { executeSwap, getPrice, getSwap2CurrencyBalance } from "../libs/swap2";
import { sourceToken, targetPrice, walletAddress } from "../libs/constants2";

var cron = require("node-cron");

export class Swap2 {
  do = async () => {
    if (!walletAddress) {
      throw new Error('error')
    }

    const balance = await getSwap2CurrencyBalance(
      walletAddress,
      sourceToken
    );
    console.log({balance})
    const bigZero = JSBI.BigInt(0);
    const bigTarget = JSBI.BigInt(targetPrice);
    if (JSBI.GT(balance, bigZero)) {
      const price = await getPrice();
      console.log({price})
      if (price) {
        const date = new Date();
        if (JSBI.GE(price, bigTarget)) {
          //Sell when price >= target price
          executeSwap()
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

