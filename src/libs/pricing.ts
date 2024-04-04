import { ethers, providers } from 'ethers'
import { getAbi } from '../libs/getAbi'
import { SUPPORTED_CHAINS, Token, Currency, CurrencyAmount, TradeType } from '@uniswap/sdk-core'
import { getPoolInfo } from '../libs/pool'
import {
    Pool, Route, SwapQuoter, Trade
} from '@uniswap/v3-sdk'
import { getQuoterAddress } from '../libs'
import { CurrentConfig } from '../config'

const provider = new ethers.providers.JsonRpcProvider(CurrentConfig.rpc.mainnet)
const poolAddress = CurrentConfig.poolAddress
const quoterAddress = getQuoterAddress()

export type TokenTrade = Trade<Token, Token, TradeType>

const getOutputQuote = async (route: Route<Currency, Currency>, provider: providers.Provider, tokenIn: Token, amountIn: string) => {
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

export async function getPrice(): Promise<string> {
    const inputAmount = 1
    //Get Pool contract info
    const poolInfo = await getPoolInfo(poolAddress, provider)
    const { token0: token0Address, token1: token1Address } = poolInfo
    if ((token0Address !== CurrentConfig.tokens.in.address && token0Address !== CurrentConfig.tokens.out.address) || (token1Address !== CurrentConfig.tokens.in.address && token1Address !== CurrentConfig.tokens.out.address)) {
        throw new Error('Pool adress invalid')
    }
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

    const amountIn = ethers.utils.parseUnits(
        inputAmount.toString(),
        tokenDecimals0
    ).toString()

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
    return amountOut3.toString();
}