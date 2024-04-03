import { ChainId } from '@uniswap/sdk-core'
import {ethers} from 'ethers'
import {getAbi} from '../../libs/getAbi'

const provider = new ethers.providers.JsonRpcProvider(process.env.BASE_URL)

export async function getDecimals(tokenAddress: string): Promise<number> {
    const tokenAbi = await getAbi(tokenAddress)    

  // Setup provider, import necessary ABI ...
  const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider)
  return tokenContract["decimals"]()
}