import { ethers } from 'ethers';
import { Token, ChainId } from '@uniswap/sdk-core';
import { SWAP_ROUTER_02_ADDRESSES } from '@uniswap/smart-order-router';
import { UNIVERSAL_ROUTER_ADDRESS } from '@uniswap/universal-router-sdk';
import { chain } from 'lodash';
import { SupportedChain } from '../types';

const wethMap: { [key: number]: string } = {
  [ChainId.MAINNET]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  [ChainId.OPTIMISM]: '0x4200000000000000000000000000000000000006',
  [ChainId.ARBITRUM_ONE]: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  [ChainId.BASE]: '0x4200000000000000000000000000000000000006',
  [ChainId.GOERLI]: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
  [ChainId.SEPOLIA]: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
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
  loading: '🏃‍♂️',
  network: '🌎',
  route: '📍',
  buy: '➕',
  sell: '➖'
}
