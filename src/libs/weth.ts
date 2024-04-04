import { ChainId } from '@uniswap/sdk-core'
import {CurrentConfig} from '../config'
import { WETH_ADDRESS, ARBITRUM_WETH_ADDRESS, OPTIMISM_WETH_ADDRESS, BASE_WETH_ADDRESS } from './constants';


const wethMap: { [key: number]: string } = {
  [ChainId.MAINNET]: WETH_ADDRESS,
  [ChainId.OPTIMISM]: OPTIMISM_WETH_ADDRESS,
  [ChainId.ARBITRUM_ONE]: ARBITRUM_WETH_ADDRESS,
  [ChainId.BASE]: BASE_WETH_ADDRESS,
}

export function getWETHAddress(): string {  
  return wethMap[CurrentConfig.chainId];
}