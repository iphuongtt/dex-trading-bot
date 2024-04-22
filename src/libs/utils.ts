import { ChainId, Token, TradeType } from '@uniswap/sdk-core'
import { Trade } from '@uniswap/v3-sdk'
import { BigNumber, ethers } from 'ethers'
import { SupportedChain } from './types'

const MAX_DECIMALS = 4

export function fromReadableAmount(
  amount: number,
  decimals: number
): BigNumber {
  return ethers.utils.parseUnits(amount.toString(), decimals)
}

export function toReadableAmount(rawAmount: number, decimals: number): string {
  return ethers.utils.formatUnits(rawAmount, decimals).slice(0, MAX_DECIMALS)
}

export function displayTrade(trade: Trade<Token, Token, TradeType>): string {
  return `${trade.inputAmount.toExact()} ${trade.inputAmount.currency.symbol
    } for ${trade.outputAmount.toExact()} ${trade.outputAmount.currency.symbol}`
}

export const removeUndefined = (obj: { [key: string]: any }) => {
  const newObj: { [key: string]: any } = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

export const isNumeric = (str: any): boolean => {
  if (typeof str != "string") return false // we only process strings!
  return !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

export const getChainId = (chain: SupportedChain): ChainId | undefined => {
  switch (chain) {
    case 'base':
      return ChainId.BASE
    default:
      break;
  }
}

export const getChainRPC = (chain: SupportedChain): string | undefined => {
  switch (chain) {
    case 'base':
      return process.env.BASE_RPC_URL
    default:
      break;
  }
}
