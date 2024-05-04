import { ethers } from 'ethers';
import { Token, ChainId } from '@uniswap/sdk-core';
import { SWAP_ROUTER_02_ADDRESSES } from '@uniswap/smart-order-router';
import { UNIVERSAL_ROUTER_ADDRESS } from '@uniswap/universal-router-sdk';
import { SupportedChain } from '../types';

export const wethMap: { [key: number]: string } = {
  [ChainId.ARBITRUM_ONE]: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  [ChainId.POLYGON]: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
  [ChainId.BNB]: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
  [ChainId.OPTIMISM]: '0x4200000000000000000000000000000000000006',
  [ChainId.BLAST]: '0x4300000000000000000000000000000000000004',
  [ChainId.BASE]: '0x4200000000000000000000000000000000000006'
}

export const usdcMap: { [key: number]: string } = {
  [ChainId.MAINNET]: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  [ChainId.POLYGON]: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  [ChainId.BNB]: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  [ChainId.ARBITRUM_ONE]: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  [ChainId.OPTIMISM]: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  [ChainId.BASE]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
}

export const usdtMap: { [key: number]: string } = {
  [ChainId.MAINNET]: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  [ChainId.POLYGON]: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
  [ChainId.BNB]: '0x55d398326f99059fF775485246999027B3197955',
  [ChainId.ARBITRUM_ONE]: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
  [ChainId.OPTIMISM]: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
}

export const daiMap: { [key: number]: string } = {
  [ChainId.OPTIMISM]: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  [ChainId.MAINNET]: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  [ChainId.ARBITRUM_ONE]: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  [ChainId.BNB]: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
  [ChainId.POLYGON]: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  [ChainId.BASE]: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
}

export const explorerMap: { [key: number]: string } = {
  [ChainId.MAINNET]: 'https://etherscan.io',
  [ChainId.OPTIMISM]: 'https://optimistic.etherscan.io',
  [ChainId.ARBITRUM_ONE]: 'https://arbiscan.io',
  [ChainId.BASE]: 'https://basescan.org',
  [ChainId.BNB]: 'https://bscscan.com',
  [ChainId.ZORA]: 'https://explorer.zora.energy',
  [ChainId.BLAST]: 'https://blastscan.io',
  [ChainId.POLYGON]: 'https://polygonscan.com',

}

export const walletAddress = process.env.WALLET_ADDRESS;
export const chainId = ChainId.BASE

export function getEthersProvider() {
  return new ethers.providers.JsonRpcProvider(`${process.env.BASE_RPC_URL}`);
}

export function getSigner() {
  return new ethers.Wallet(`${process.env.WALLET_SECRET}`, getEthersProvider());
}

export const uniswapRouterAddress =
  process.env.UNISWAP_ROUTER === 'UNIVERSAL'
    ? UNIVERSAL_ROUTER_ADDRESS(chainId)
    : SWAP_ROUTER_02_ADDRESSES(chainId);

export const WETH = new Token(
  chainId,
  wethMap[chainId],
  18,
  'WETH',
  'Wrapped Ether'
);

export const FRAME_TOKEN = new Token(
  ChainId.BASE,
  '0x91f45aa2bde7393e0af1cc674ffe75d746b93567',
  18,
  'FRAME',
  'FRAME'
);

export const UNI_TOKEN = new Token(
  ChainId.SEPOLIA,
  '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  18,
  'UNI',
  'UNI'
);

export const USDC_TOKEN = new Token(
  ChainId.SEPOLIA,
  '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  18,
  'USDC',
  'USDC'
);

export const sourceToken = FRAME_TOKEN
export const destToken = WETH
export const targetPrice = 0.000000001593
export const amontSourceToken = 100000

export const getExplorer = (chain: SupportedChain): string => {
  switch (chain) {
    case 'base':
      return explorerMap[ChainId.BASE]
    case 'arbitrum_one':
      return explorerMap[ChainId.ARBITRUM_ONE]
    case 'blast':
      return explorerMap[ChainId.BLAST]
    case 'bnb':
      return explorerMap[ChainId.BNB]
    case 'mainnet':
      return explorerMap[ChainId.MAINNET]
    case 'optimism':
      return explorerMap[ChainId.OPTIMISM]
    case 'polygon':
      return explorerMap[ChainId.POLYGON]
    case 'zora':
      return explorerMap[ChainId.ZORA]
    default:
      break;
  }
  return ''
}


export const emojs = {
  yes: '👍',
  no: '🚫',
  cancel: '🚫',
  checked: '✅',
  pending: '⚡️',
  add: '➕',
  edit: '✏️',
  del: '❌',
  refresh: '🔄',
  order: '🦄',
  target: '🎯',
  back: '🔙',
  close: '❌',
  template: '',
  address: '🏘',
  name: '🐊',
  key: '🔑',
  seed: '🌱',
  error: '😭',
  loading: '⌛️',//'🏃‍♂️',
  network: '🌎',
  route: '📍',
  buy: '🔼',
  sell: '🔽',
  view: '👀',
  date: '⏱',
  balance: '💵',
  gas: '⛽️'
}
