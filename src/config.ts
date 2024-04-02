import { Token } from '@uniswap/sdk-core'
import { FeeAmount } from '@uniswap/v3-sdk'
import { FRAME_TOKEN, WETH_TOKEN_BASE } from './libs/constants'

// Inputs that configure this example to run
export interface ExampleConfig {
  rpc: {
    local: string
    mainnet: string
    base: string
  }
  tokens: {
    base: Token
    baseAmount: number
    quote: Token
    poolFee: number
  }
}

// Example Configuration

export const CurrentConfig: ExampleConfig = {
  rpc: {
    local: 'http://localhost:8545',
    mainnet: '',
    base: process.env.BASE_URL || ''
  },
  tokens: {
    base: FRAME_TOKEN,
    baseAmount: 1000,
    quote: WETH_TOKEN_BASE,
    poolFee: FeeAmount.MEDIUM,
  },
}