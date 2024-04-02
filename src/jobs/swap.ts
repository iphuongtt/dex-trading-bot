var cron = require("node-cron");
import {quote} from '../libs/quote'
// import {quotePair} from '../uniswap/quote'
const {PRIVATE_KEY} = process.env
export class Swap {
  do = async () => {    
    // quotePair();
    quote();
  };

  start = async () => {
    cron.schedule("0 */4 * * *", this.do);
  };
}
