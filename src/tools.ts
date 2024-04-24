import { ChainId, Token } from '@uniswap/sdk-core'
import { UNIVERSAL_ROUTER_ADDRESS } from '@uniswap/universal-router-sdk'
import { Alchemy, Network } from "alchemy-sdk";
import CryptoJS from 'crypto-js'
import { ethers } from 'ethers-new'
import _ from 'lodash'

export const decrypt = (telegram_id: number, _secret: string, code: string): string => {
  const key = `KEYKEYKEY${telegram_id}_${_secret}`
  return CryptoJS.AES.decrypt(code, key).toString(CryptoJS.enc.Utf8)
}

export const encrypt = (telegram_id: number, _secret: string, txt: string): string => {
  const key = `KEYKEYKEY${telegram_id}_${_secret}`
  return CryptoJS.AES.encrypt(txt, key).toString()
}


const receiptLog = [{ "transactionIndex": 36, "blockNumber": 13569139, "transactionHash": "0x94901952f15d3e63f4d289b0816bc4b54d8b575435744f927aab1b797326b5ec", "address": "0x000000000022D473030F116dDEE9F6B43aC78BA3", "topics": ["0xc6a377bfc4eb120024a8ac08eef205be16b817020812c73223e81d1bdb9708ec", "0x0000000000000000000000007089496c075752949424a3e6d2040de4b52872da", "0x00000000000000000000000091f45aa2bde7393e0af1cc674ffe75d746b93567", "0x0000000000000000000000003fc91a3afd70395cd496c647d5a6cc9d4b2b7fad"], "data": "0x00000000000000000000000000000000000000000000152d02c7e14af680000000000000000000000000000000000000000000000000000000000000662877f80000000000000000000000000000000000000000000000000000000000000004", "logIndex": 120, "blockHash": "0x89d4e69c38ceee5968c9cc259e4d42e73dcb54e2599fec9354d7f2923bfbdbc3" }, { "transactionIndex": 36, "blockNumber": 13569139, "transactionHash": "0x94901952f15d3e63f4d289b0816bc4b54d8b575435744f927aab1b797326b5ec", "address": "0x4200000000000000000000000000000000000006", "topics": ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "0x000000000000000000000000087fb86ae1856c2fd375cfea68e0f74df9ec6906", "0x0000000000000000000000007089496c075752949424a3e6d2040de4b52872da"], "data": "0x00000000000000000000000000000000000000000000000000005803f3eae9e1", "logIndex": 121, "blockHash": "0x89d4e69c38ceee5968c9cc259e4d42e73dcb54e2599fec9354d7f2923bfbdbc3" }, { "transactionIndex": 36, "blockNumber": 13569139, "transactionHash": "0x94901952f15d3e63f4d289b0816bc4b54d8b575435744f927aab1b797326b5ec", "address": "0x91F45aa2BdE7393e0AF1CC674FFE75d746b93567", "topics": ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "0x0000000000000000000000007089496c075752949424a3e6d2040de4b52872da", "0x000000000000000000000000087fb86ae1856c2fd375cfea68e0f74df9ec6906"], "data": "0x00000000000000000000000000000000000000000000152d02c7e14af6800000", "logIndex": 122, "blockHash": "0x89d4e69c38ceee5968c9cc259e4d42e73dcb54e2599fec9354d7f2923bfbdbc3" }, { "transactionIndex": 36, "blockNumber": 13569139, "transactionHash": "0x94901952f15d3e63f4d289b0816bc4b54d8b575435744f927aab1b797326b5ec", "address": "0x087Fb86aE1856c2FD375Cfea68E0F74dF9ec6906", "topics": ["0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67", "0x0000000000000000000000003fc91a3afd70395cd496c647d5a6cc9d4b2b7fad", "0x0000000000000000000000007089496c075752949424a3e6d2040de4b52872da"], "data": "0xffffffffffffffffffffffffffffffffffffffffffffffffffffa7fc0c15161f00000000000000000000000000000000000000000000152d02c7e14af68000000000000000000000000000000000000000007d8d6ce13985006dc01010923ca300000000000000000000000000000000000000000000003d41f3854091c472c00000000000000000000000000000000000000000000000000000000000032ad0", "logIndex": 123, "blockHash": "0x89d4e69c38ceee5968c9cc259e4d42e73dcb54e2599fec9354d7f2923bfbdbc3" }]


const parseSwapLog = (logs: object[], tokenIn: Token, tokenOut: Token) => {
  const swapEventTopic = ethers.id('Swap(address,address,int256,int256,uint160,uint128,int24)')
  const swapLogs = logs.filter(log => {
    if ('topics' in log && _.isArray(log.topics)) {
      return log.topics[0] === swapEventTopic
    }
  });
  // take the last swap event
  const lastSwapEvent = swapLogs.slice(-1)[0]
  // // decode the data
  const swapInterface = new ethers.Interface('[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":true,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"int256","name":"amount0","type":"int256"},{"indexed":false,"internalType":"int256","name":"amount1","type":"int256"},{"indexed":false,"internalType":"uint160","name":"sqrtPriceX96","type":"uint160"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"int24","name":"tick","type":"int24"}],"name":"Swap","type":"event"}]')
  
  if ('topics' in lastSwapEvent && 'data' in lastSwapEvent && lastSwapEvent.topics && _.isArray(lastSwapEvent.topics) && lastSwapEvent.data && _.isString(lastSwapEvent.data)) {
    const parsed = swapInterface.parseLog({
      topics: lastSwapEvent.topics,
      data: lastSwapEvent.data,
    });
    const tokenInAmount = ethers.formatUnits(parsed?.args.amount1, tokenIn.decimals)
    const tokenOutAmount = ethers.formatUnits(parsed?.args.amount0, tokenOut.decimals)
    return {
      tokenInAmount, tokenOutAmount
    }
  } else {
    return false
  }
  // // use the non zero value
  // const receivedTokens = parsed.args.amount0Out.isZero() ?  parsed.args.amount1Out : parsed.args.amount0Out;


}
// console.log(encrypt(0, '', ''))

// Setup: npm install alchemy-sdk


const config = {
  apiKey: "Lf6w1-1kacqfoPEYSsfOKZUXWLbAU7a4",
  network: Network.BASE_MAINNET,
};
const alchemy = new Alchemy(config);

// The token address we want to query for metadata
alchemy.core.getTokenMetadata(
  "0x4200000000000000000000000000000000000006"
).then(metaData => {
  console.log(metaData)
});

