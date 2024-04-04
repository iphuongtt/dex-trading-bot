import { ChainId } from '@uniswap/sdk-core'
import {CurrentConfig} from '../config'
import { BASE_SWAP_ROUTER_ADDRESS, BNB_SWAP_ROUTER_ADDRESS, CELO_SWAP_ROUTER_ADDRESS, V3_SWAP_ROUTER_ADDRESS } from './constants';


const routerMap: { [key: number]: string } = {
  [ChainId.BASE]: BASE_SWAP_ROUTER_ADDRESS,
  [ChainId.OPTIMISM]: V3_SWAP_ROUTER_ADDRESS,
  [ChainId.ARBITRUM_ONE]: V3_SWAP_ROUTER_ADDRESS,
  [ChainId.POLYGON]: V3_SWAP_ROUTER_ADDRESS,
  [ChainId.GOERLI]: V3_SWAP_ROUTER_ADDRESS,
  [ChainId.CELO]: CELO_SWAP_ROUTER_ADDRESS,
  [ChainId.BNB]: BNB_SWAP_ROUTER_ADDRESS
}

export function getRouterAddress(): string {  
  return routerMap[CurrentConfig.chainId];
}