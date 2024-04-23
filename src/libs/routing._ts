import {
  AlphaRouter,
  SwapOptionsUniversalRouter,
  SwapOptions,
  SwapRoute,
  SwapType,
  MAX_UINT160,
} from '@uniswap/smart-order-router'
import { TradeType, CurrencyAmount, Percent, Token } from '@uniswap/sdk-core'
import { Trade as V2TradeSDK } from '@uniswap/v2-sdk'
import { Trade as V3TradeSDK } from '@uniswap/v3-sdk'
import { MixedRouteTrade, MixedRouteSDK, Trade as RouterTrade } from '@uniswap/router-sdk'
import { UniswapTrade, PERMIT2_ADDRESS } from "@uniswap/universal-router-sdk";
import { AllowanceTransfer, PermitSingle } from '@uniswap/permit2-sdk'
import JSBI from "jsbi";
import { CurrentConfig } from '../config'
import {
  getMainnetProvider,
  getWalletAddress,
  sendTransaction,
  TransactionState,
  getProvider,
  getMainnetChainId,
  getWallet,
} from './providers'
import {
  MAX_FEE_PER_GAS,
  MAX_PRIORITY_FEE_PER_GAS,
  MAX_UINT,
  PERMIT2_APPROVE_ABI
} from './constants'
import { fromReadableAmount } from './conversion'
import { BigNumber, ContractInterface, Wallet, ethers } from 'ethers'
import { getRouterAddress } from './router'

export async function generateRoute(): Promise<SwapRoute | null> {
  const router = new AlphaRouter({
    chainId: getMainnetChainId(),
    provider: getMainnetProvider(),
  })

  const options: SwapOptions = {
    recipient: CurrentConfig.wallet.address,
    slippageTolerance: new Percent(50, 10_000),
    // deadline: Math.floor(Date.now() / 1000 + 1800),
    type: SwapType.UNIVERSAL_ROUTER
  }

  const route = await router.route(
    CurrencyAmount.fromRawAmount(
      CurrentConfig.tokens.in,
      fromReadableAmount(
        CurrentConfig.tokens.amountIn,
        CurrentConfig.tokens.in.decimals
      ).toString()
    ),
    CurrentConfig.tokens.out,
    TradeType.EXACT_INPUT,
    options
  ).catch(err => {
    console.log('routing error', err)
    return null
  })
  if (route) {
    const routePath = route.route
      .map((r) => r.tokenPath.map((t) => t.symbol).join(' -> '))
      .join(', ')
    console.log({ routePath })

    console.log('Swap: ', `Route: ${CurrentConfig.tokens.amountIn} ${CurrentConfig.tokens.in.symbol
      } to ${route.quote.toExact()} ${route.quote.currency.symbol
      } using $${route.estimatedGasUsedUSD.toExact()} worth of gas`)
  }
  return route
}

export async function executeRoute(
  route: SwapRoute
): Promise<TransactionState> {
  const walletAddress = getWalletAddress()
  const provider = getProvider()

  if (!walletAddress || !provider) {
    throw new Error('Cannot execute a trade without a connected wallet')
  }

  const tokenApproval = await getTokenTransferApproval(CurrentConfig.tokens.in, CurrentConfig.tokens.tokenInABI, JSBI.BigInt(CurrentConfig.tokens.amountIn))

  // Fail if transfer approvals do not go through
  if (tokenApproval !== TransactionState.Sent) {
    return TransactionState.Failed
  }


  console.log({
    data: route.methodParameters?.calldata,
    to: getRouterAddress(),
    value: BigNumber.from(route?.methodParameters?.value),
    from: walletAddress,
    // maxFeePerGas: MAX_FEE_PER_GAS,
    // maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
    gasPrice: BigNumber.from(route.gasPriceWei),
    gasLimit: ethers.utils.hexlify(100000)
  })
  // const res = await sendTransaction({
  //   data: route.methodParameters?.calldata,
  //   to: getRouterAddress(),
  //   value: BigNumber.from(route?.methodParameters?.value),
  //   from: walletAddress,
  //   maxFeePerGas: MAX_FEE_PER_GAS,
  //   maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  //   gasPrice: BigNumber.from(route.gasPriceWei),
  //   gasLimit: ethers.utils.hexlify(100000)
  // })

  // return res
  return TransactionState.Failed
}

export async function getTokenTransferApproval(
  token: Token, abi: ContractInterface, amountIn: JSBI
): Promise<TransactionState> {
  const provider = getProvider()
  const address = getWalletAddress()
  const routerAddress = getRouterAddress()
  if (!provider || !address) {
    console.log('No Provider Found')
    return TransactionState.Failed
  }

  try {
    const tokenContract = new ethers.Contract(
      token.address,
      abi,
      provider
    )
    //Check Allowance
    const allowance: BigNumber = await tokenContract.allowance(address, routerAddress)

    if (JSBI.LT(allowance, amountIn)) {
      console.log(amountIn.toString())
      const transaction = await tokenContract.populateTransaction.approve(
        getRouterAddress(),
        fromReadableAmount(
          JSBI.toNumber(amountIn),
          token.decimals
        ).toString()
      )
      return sendTransaction({
        ...transaction,
        from: address,
      })
    } else {
      return TransactionState.Sent
    }

  } catch (e) {
    console.error(e)
    return TransactionState.Failed
  }
}


export async function getTokenTransferApprovalPermit(
  token: Token, abi: ContractInterface, amountIn: JSBI
): Promise<TransactionState> {
  const provider = getProvider()
  const address = getWalletAddress()
  const routerAddress = getRouterAddress()
  if (!provider || !address) {
    console.log('No Provider Found')
    return TransactionState.Failed
  }

  try {
    const tokenContract = new ethers.Contract(
      token.address,
      abi,
      provider
    )
    //Check Allowance
    const allowance: BigNumber = await tokenContract.allowance(address, PERMIT2_ADDRESS)

    if (JSBI.LT(allowance, amountIn)) {
      console.log(amountIn.toString())
      const transaction = await tokenContract.populateTransaction.approve(
        getRouterAddress(),
        fromReadableAmount(
          JSBI.toNumber(amountIn),
          token.decimals
        ).toString()
      )
      return sendTransaction({
        ...transaction,
        from: address,
      })
    } else {
      return TransactionState.Sent
    }

  } catch (e) {
    console.error(e)
    return TransactionState.Failed
  }
}


function makePermit(
  tokenAddress: string,
  amount: string,
  nonce: number
): PermitSingle {
  return {
    details: {
      token: tokenAddress,
      amount,
      expiration: Math.floor(new Date().getTime() / 1000 + 100000).toString(),
      nonce,
    },
    spender: getRouterAddress(),
    sigDeadline: Math.floor(new Date().getTime() / 1000 + 100000).toString(),
  }
}

async function generatePermitSignature(permit: PermitSingle) {
  const signer = getWallet()
  const { domain, types, values } = AllowanceTransfer.getPermitData(permit, PERMIT2_ADDRESS, getMainnetChainId())
  return await signer._signTypedData(domain, types, values)
}

async function main() {
  const usePermit2Sig = false
  const provider = getProvider()
  if (!provider) {
    throw new Error('no provider')
  }
  // max amount to permit for
  const permitAmount = ethers.constants.MaxUint256.toString()
  // approve permit2 to manipulate token in for us  
  const walletAddress = getWalletAddress()
  if (!walletAddress) {
    throw new Error('wallet not found')
  }
  const tokenApproval = await getTokenTransferApprovalPermit(CurrentConfig.tokens.in, CurrentConfig.tokens.tokenInABI, JSBI.BigInt(CurrentConfig.tokens.amountIn))

  // Fail if transfer approvals do not go through
  if (tokenApproval !== TransactionState.Sent) {
    return TransactionState.Failed
  }
  // permissions
  console.log(`Using Permit2 with ${usePermit2Sig ? 'signature' : 'litteral approval (tx)'}`)
  let permit, signature
  if (usePermit2Sig) {
    // create signed permit
    permit = makePermit(CurrentConfig.tokens.in.address, permitAmount.toString(), 0)
    signature = await generatePermitSignature(permit)
  } else {
    const permit2 = new ethers.Contract(
      PERMIT2_ADDRESS,
      PERMIT2_APPROVE_ABI,
      provider
    )
    const txApproval = await permit2.approve(
      CurrentConfig.tokens.in.address,
      getRouterAddress(),
      MAX_UINT160,
      20_000_000_000_000 // expiration
    )
    const { transactionHash } = await txApproval.wait()
    console.log(`Approved premit2 to spend USDC at tx: ${transactionHash}`)
  }

  let swapOptions = {
    type: SwapType.UNIVERSAL_ROUTER,
    recipient: CurrentConfig.wallet.address,
    slippageTolerance: new Percent(5, 100),
    deadline: Math.floor(Date.now() / 1000 + 1800),    
    ...permit,
    signature
  }
  const router = new AlphaRouter({
    chainId: getMainnetChainId(),
    provider: getMainnetProvider(),
  })

  const route2 = await router.route(CurrencyAmount.fromRawAmount(
    CurrentConfig.tokens.in,
    fromReadableAmount(
      CurrentConfig.tokens.amountIn,
      CurrentConfig.tokens.in.decimals
    ).toString()
  ),
    CurrentConfig.tokens.out,
    TradeType.EXACT_INPUT,
    swapOptions).catch(err => {
      console.log('routing error', err)
      return null
    })
  if (!route2) {
    throw new Error('No router found')
  }
  const routePath = route2.route
    .map((r) => r.tokenPath.map((t) => t.symbol).join(' -> '))
    .join(', ')
  console.log({ routePath })

  console.log('Swap: ', `Route: ${CurrentConfig.tokens.amountIn} ${CurrentConfig.tokens.in.symbol
    } to ${route2.quote.toExact()} ${route2.quote.currency.symbol
    } using $${route2.estimatedGasUsedUSD.toExact()} worth of gas`)

  console.log(`Quote Exact In: ${route2.quote.toFixed(2)}`);
  console.log(`Gas Adjusted Quote In: ${route2.quoteGasAdjusted.toFixed(2)}`);
  console.log(`Gas Used USD: ${route2.estimatedGasUsedUSD.toFixed(6)}`);

  const signer = getWallet()

  console.log('Execture trade...')
  const transaction = {
    data: route2.methodParameters?.calldata,
    to: route2.methodParameters?.to,
    value: route2.methodParameters?.value,
    from: signer.address,
    // gasPrice: BigNumber.from(route2.gasPriceWei),
  };

  const tx = await signer.sendTransaction(transaction)
  const { transactionHash: tradeHash } = await tx.wait()
  console.log(`Trade executed at ${tradeHash}.`)
}



main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })