// This file stores web3 related constants such as addresses, token definitions, ETH currency references and ABI's

import { SUPPORTED_CHAINS, Token } from '@uniswap/sdk-core'

// Addresses

export const POOL_FACTORY_CONTRACT_ADDRESS =
  '0x1F98431c8aD98523631AE4a59f267346ea31F984'
  export const POOL_FACTORY_CONTRACT_ADDRESS_BASE =
  '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
export const QUOTER_CONTRACT_ADDRESS =
  '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
export const QUOTER_CONTRACT_ADDRESS_BASE = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'

// Currencies and Tokens

export const FRAME_TOKEN = new Token(
  SUPPORTED_CHAINS[15],
  '0x91f45aa2bde7393e0af1cc674ffe75d746b93567',
  18,
  'FRAME',
  'FRAME'
)

export const WETH_TOKEN_BASE = new Token(
    SUPPORTED_CHAINS[15],
  '0x4200000000000000000000000000000000000006',
  18,
  'WETH',
  'WETH'
)

export const BASESCAN_API_KEY = 'VVSHZI33ASMG4KY812XFIW4HR71GABHZ9B'
export const BASESCAN_API_URL = 'https://api.basescan.org/api'