import { ChainId, Token } from '@uniswap/sdk-core'
import { FeeAmount } from '@uniswap/v3-sdk'
import {ContractInterface} from 'ethers'
import { FRAME_TOKEN, WETH_TOKEN_BASE } from './libs/constants'
import FrameABI from './tokenABI/base/frame.json'
import WETHABI from './tokenABI/base/weth.json'

export enum Environment {
  LOCAL,
  WALLET_EXTENSION,
  MAINNET,
}

// Inputs that configure this example to run
export interface ExampleConfig {
  env: Environment
  rpc: {
    local: string
    mainnet: string
  }
  wallet: {
    address: string
    privateKey: string
  }
  tokens: {
    in: Token
    tokenInABI: ContractInterface
    amountIn: number
    targetPrice: number
    out: Token
    tokenOutABI: ContractInterface
    poolFee: number
  }
  poolAddress: string,
  chainId: number
}

// Example Configuration

export const CurrentConfig: ExampleConfig = {
  env: Environment.MAINNET,
  rpc: {
    local: 'http://localhost:8545',
    mainnet: process.env.BASE_RPC_URL || ''
  },
  chainId: ChainId.BASE,
  tokens: {
    in: FRAME_TOKEN,
    tokenInABI: FrameABI,
    amountIn: 100000,
    targetPrice: 1209000000,
    out: WETH_TOKEN_BASE,
    tokenOutABI: WETHABI,
    poolFee: FeeAmount.MEDIUM,
  },
  wallet: {
    address: process.env.WALLET_ADDRESS || '',
    privateKey: process.env.PRIVATE_KEY || '',
  },
  poolAddress: '0x64b74c66b9BA60ca668b781289767AE7298F37Ae' //https://info.uniswap.org/#/base/pools/0x64b74c66b9ba60ca668b781289767ae7298f37ae
}

export const firestore = {
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  privateKey: process.env.FIREBASE_PRIVATE_KEY || '',    
}