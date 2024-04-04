import { ChainId } from '@uniswap/sdk-core'
import {CurrentConfig} from '../config'
import { BASE_QUOTER_ADDRESS, BNB_QUOTER_ADDRESS, CELO_QUOTER_ADDRESS, V3_QUOTER_ADDRESS } from './constants';


const quoterMap: { [key: number]: string } = {
  [ChainId.BASE]: BASE_QUOTER_ADDRESS,
  [ChainId.OPTIMISM]: V3_QUOTER_ADDRESS,
  [ChainId.ARBITRUM_ONE]: V3_QUOTER_ADDRESS,
  [ChainId.POLYGON]: V3_QUOTER_ADDRESS,
  [ChainId.GOERLI]: V3_QUOTER_ADDRESS,
  [ChainId.CELO]: CELO_QUOTER_ADDRESS,
  [ChainId.BNB]: BNB_QUOTER_ADDRESS
}

export function getQuoterAddress(): string {
  return quoterMap[CurrentConfig.chainId];
}