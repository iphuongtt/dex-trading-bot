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
export const MAX_FEE_PER_GAS = 100000000000
export const MAX_PRIORITY_FEE_PER_GAS = 100000000000
export const TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER = 10000

export const ERC20_ABI = [
  // Read-Only Functions
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',

  // Authenticated Functions
  'function transfer(address to, uint amount) returns (bool)',
  'function approve(address _spender, uint256 _value) returns (bool)',

  // Events
  'event Transfer(address indexed from, address indexed to, uint amount)',
]

export const WETH_ABI = [
  // Wrap ETH
  'function deposit() payable',

  // Unwrap ETH
  'function withdraw(uint wad) public',
]

//Router address: https://docs.uniswap.org/contracts/v3/reference/deployments
export const V3_SWAP_ROUTER_ADDRESS =
  '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
export const BASE_SWAP_ROUTER_ADDRESS =
  '0x2626664c2603336E57B271c5C0b26F421741e481'
export const CELO_SWAP_ROUTER_ADDRESS =
  '0x5615CDAb10dc425a742d643d949a7F474C01abc4'
export const BNB_SWAP_ROUTER_ADDRESS = '0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2'

//Qouter address: https://docs.uniswap.org/contracts/v3/reference/deployments
export const V3_QUOTER_ADDRESS =
  '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
export const BASE_QUOTER_ADDRESS =
  '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'
export const CELO_QUOTER_ADDRESS =
  '0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8'
export const BNB_QUOTER_ADDRESS = '0x78D78E420Da98ad378D7799bE8f4AF69033EB077'
//WETH address: https://docs.uniswap.org/contracts/v3/reference/deployments
export const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
export const ARBITRUM_WETH_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
export const OPTIMISM_WETH_ADDRESS = '0x4200000000000000000000000000000000000006'
export const BASE_WETH_ADDRESS = '0x4200000000000000000000000000000000000006'