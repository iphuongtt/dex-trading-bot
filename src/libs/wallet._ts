// This file contains code to easily connect to and get information from a wallet on chain

import { Currency } from '@uniswap/sdk-core'
import { BigNumber, ethers } from 'ethers'
import {
  ERC20_ABI,
  WETH_ABI,
  MAX_FEE_PER_GAS,
  MAX_PRIORITY_FEE_PER_GAS,
} from './constants'
import { toReadableAmount } from './conversion'
import JSBI from 'jsbi'
import { getProvider, getWalletAddress, sendTransaction } from './providers'
import { getWETHAddress } from './weth'

export async function getCurrencyBalance(  
  address: string,
  currency: Currency
): Promise<string> {
  const provider = getProvider()
  if (!provider || !address) {
    throw new Error('Cannot wrap ETH without a provider and wallet address')
  }
  // Handle ETH directly
  if (currency.isNative) {
    return ethers.utils.formatEther(await provider.getBalance(address))
  }

  // Get currency otherwise
  const walletContract = new ethers.Contract(
    currency.address,
    ERC20_ABI,
    provider
  )
  const balance: number = await walletContract.balanceOf(address)
  const decimals: number = await walletContract.decimals()

  console.log({getCurrencyBalance:balance})

  // Format with proper units (approximate)
  return toReadableAmount(balance, decimals).toString()
}

// wraps ETH (rounding up to the nearest ETH for decimal places)
export async function wrapETH(eth: number) {
  const provider = getProvider()
  const address = getWalletAddress()
  if (!provider || !address) {
    throw new Error('Cannot wrap ETH without a provider and wallet address')
  }

  const wethContract = new ethers.Contract(
    getWETHAddress(),
    WETH_ABI,
    provider
  )

  const transaction = {
    data: wethContract.interface.encodeFunctionData('deposit'),
    value: BigNumber.from(Math.ceil(eth))
      .mul(JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(18)).toString())
      .toString(),
    from: address,
    to: getWETHAddress(),
    maxFeePerGas: MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  }

  await sendTransaction(transaction)
}

// unwraps ETH (rounding up to the nearest ETH for decimal places)
export async function unwrapETH(eth: number) {
  const provider = getProvider()
  const address = getWalletAddress()
  if (!provider || !address) {
    throw new Error('Cannot unwrap ETH without a provider and wallet address')
  }

  const wethContract = new ethers.Contract(
    getWETHAddress(),
    WETH_ABI,
    provider
  )

  const transaction = {
    data: wethContract.interface.encodeFunctionData('withdraw', [
      BigNumber.from(Math.ceil(eth))
        .mul(JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(18)).toString())
        .toString(),
    ]),
    from: address,
    to: getWETHAddress(),
    maxFeePerGas: MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  }

  await sendTransaction(transaction)
}