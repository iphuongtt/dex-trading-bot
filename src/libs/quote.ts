import { ethers } from 'ethers'
import { CurrentConfig } from '../config'
import { computePoolAddress, TickMath, FullMath } from '@uniswap/v3-sdk'
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json'
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import {
  POOL_FACTORY_CONTRACT_ADDRESS_BASE,
  QUOTER_CONTRACT_ADDRESS_BASE,
} from '../libs/constants'
import { getProvider } from '../libs/providers'
import JSBI from 'jsbi'
import { toReadableAmount, fromReadableAmount } from '../libs/conversion'


//FRAME/WETH ~ BASE/QUOTE
export async function quote(): Promise<string> {
//   const quoterContract = new ethers.Contract(
//     QUOTER_CONTRACT_ADDRESS_BASE,
//     Quoter.abi,
//     getProvider()
//   )
  const poolConstants = await getPoolConstants()

  const currentTick = 0;
  const inputAmount = 1

  const sqrtRatioX96 = TickMath.getSqrtRatioAtTick(currentTick)
  const ratioX192 = JSBI.multiply(sqrtRatioX96, sqrtRatioX96)
  const baseAmount = JSBI.BigInt(inputAmount * (10 ** CurrentConfig.tokens.base.decimals))
  const shift = JSBI.leftShift(JSBI.BigInt(1), JSBI.BigInt(192))
  const quoteAmount = FullMath.mulDivRoundingUp(ratioX192, baseAmount, shift)

  console.log(quoteAmount.toString() / 10 ** CurrentConfig.tokens.quote.decimals)

  console.log({poolConstants})

//   const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(
//     poolConstants.token0,
//     poolConstants.token1,
//     poolConstants.fee,
//     fromReadableAmount(
//       CurrentConfig.tokens.amountIn,
//       CurrentConfig.tokens.in.decimals
//     ).toString(),
//     0
//   )
    return '';
//   return toReadableAmount(quotedAmountOut, CurrentConfig.tokens.out.decimals)
}

async function getPoolConstants(): Promise<{
  token0: string
  token1: string
  fee: number
  currentPoolAddress: string
}> {
  const currentPoolAddress = computePoolAddress({
    factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS_BASE,
    tokenA: CurrentConfig.tokens.base,
    tokenB: CurrentConfig.tokens.quote,
    fee: CurrentConfig.tokens.poolFee,
  })

  const poolContract = new ethers.Contract(
    currentPoolAddress,
    IUniswapV3PoolABI.abi,
    getProvider()
  )
  const [token0, token1, fee] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
  ])

  return {
    currentPoolAddress,
    token0,
    token1,
    fee,
  }
}