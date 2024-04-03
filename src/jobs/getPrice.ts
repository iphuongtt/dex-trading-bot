import { ethers, Contract, providers } from 'ethers'
import { BigNumber } from "@ethersproject/bignumber";
import BaseQuoter from '../uniswap/contracts/BaseQuote.json'
import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import { getAbi } from '../libs/getAbi'
import { SUPPORTED_CHAINS, Token, Currency, CurrencyAmount, TradeType } from '@uniswap/sdk-core'
import {getPoolInfo} from '../libs/pool'
import {
  Pool, Route, SwapQuoter, Trade
} from '@uniswap/v3-sdk'
import JSBI from 'jsbi';

const provider = new ethers.providers.JsonRpcProvider(process.env.BASE_URL)
const poolAddress = '0x64b74c66b9BA60ca668b781289767AE7298F37Ae' //https://info.uniswap.org/#/base/pools/0x64b74c66b9ba60ca668b781289767ae7298f37ae
const quoterAddress = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a"

const getOutputQuote = async  (route: Route<Currency, Currency>, provider: providers.Provider, tokenIn: Token, amountIn: string) => {
  if (!provider) {
    throw new Error('Provider required to get pool state')
  }

  const { calldata } = await SwapQuoter.quoteCallParameters(
    route,
    CurrencyAmount.fromRawAmount(
      tokenIn,
      amountIn
    ),
    TradeType.EXACT_INPUT,
    {
      useQuoterV2: true,
    }
  )

  const quoteCallReturnData = await provider.call({
    to: quoterAddress,
    data: calldata,
  })

  return ethers.utils.defaultAbiCoder.decode(['uint256'], quoteCallReturnData)
}

export async function getPriceWETHFRAME(inputAmount: number): Promise<string> {
  const sellPrice = 0.00000000235  
  //Get Pool contract info
  const poolInfo = await getPoolInfo(poolAddress, provider)
  const {token0: token0Address, token1: token1Address} = poolInfo

  const tokenAbi0 = await getAbi(token0Address)
  const tokenAbi1 = await getAbi(token1Address)

  const tokenContract0 = new ethers.Contract(
    token0Address,
    tokenAbi0,
    provider
  )
  const tokenContract1 = new ethers.Contract(
    token1Address,
    tokenAbi1,
    provider
  )

  const tokenSymbol0 = await tokenContract0.symbol()
  const tokenSymbol1 = await tokenContract1.symbol()
  const tokenDecimals0 = await tokenContract0.decimals()
  const tokenDecimals1 = await tokenContract1.decimals() 
  const tokenName0 = await tokenContract0.name()
  const tokenName1 = await tokenContract1.name()

  const token0 = new Token(SUPPORTED_CHAINS[15], token0Address, tokenDecimals0, tokenSymbol0, tokenName0)
  const token1 = new Token(SUPPORTED_CHAINS[15], token1Address, tokenDecimals1, tokenSymbol1, tokenName1)
  

  const quoterContract = new ethers.Contract(
    quoterAddress,
    BaseQuoter,
    provider
  )  

  const amountIn = ethers.utils.parseUnits(
    inputAmount.toString(),
    tokenDecimals0
  ).toString()
  
  const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(
    {
      tokenIn: poolInfo.token1,
      tokenOut: poolInfo.token0,
      amountIn: amountIn,
      fee: poolInfo.fee,
      sqrtPriceLimitX96: 0
    }
  )
  // console.log({quotedAmountOut})
  const { amountOut } = quotedAmountOut
  const amountOut2 = ethers.utils.formatUnits(amountOut, tokenDecimals0)
  const amountOut2Num = parseFloat(amountOut2)
  console.log({amountOut2Num})
  if (amountOut2Num > sellPrice) {
    console.log('Sell now')
  } else {
    console.log('Dont Sell')
  }
  console.log('=========')
  console.log(`${inputAmount} ${tokenSymbol1} can be swapped for ${amountOut2} ${tokenSymbol0}`)
  console.log('=========')

  const pool = new Pool(
    token0,
    token1,
    poolInfo.fee,
    poolInfo.sqrtPriceX96.toString(),
    poolInfo.liquidity.toString(),
    poolInfo.tick
  )

  const swapRoute = new Route(
    [pool],
    token1,
    token0
  )



  const amountOut3 = await getOutputQuote(swapRoute, provider, token1, amountIn)


  console.log({amountOut3: ethers.utils.formatUnits(amountOut3, tokenDecimals1)})

  // const uncheckedTrade = Trade.createUncheckedTrade({
  //   route: swapRoute,
  //   inputAmount: CurrencyAmount.fromRawAmount(
  //     token1,
  //     amountIn
  //   ),
  //   outputAmount: CurrencyAmount.fromRawAmount(
  //     token0,
  //     JSBI.BigInt(amountOut3.toString())
  //   ),
  //   tradeType: TradeType.EXACT_INPUT,
  // })
  return '';
}

