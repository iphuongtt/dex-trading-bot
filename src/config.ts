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
    in: Token
    amountIn: number
    out: Token
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
    in: FRAME_TOKEN,
    amountIn: 1000,
    out: WETH_TOKEN_BASE,
    poolFee: FeeAmount.MEDIUM,
  },
}