import { ethers, BigNumber } from 'ethers';
import {
  PERMIT2_ADDRESS,
  SignatureTransfer,
  AllowanceTransfer,
  AllowanceProvider
} from '@uniswap/permit2-sdk';
import { AlphaRouter, SwapType } from '@uniswap/smart-order-router';
import { CurrencyAmount, TradeType, Percent, Token, Currency } from '@uniswap/sdk-core';
import erc20Abi from '../tokenABI/erc20.json'
import {
  chainId,
  getSigner,
  walletAddress,
  getEthersProvider,
  uniswapRouterAddress,
  sourceToken,
  destToken,
  amontSourceToken
} from './constants2';
import { Permit2Permit } from '@uniswap/universal-router-sdk/dist/utils/inputTokens';

const ethersProvider = getEthersProvider();
const ethersSigner = getSigner();

export async function getSwap2CurrencyBalance(
  address: string,
  currency: Currency
): Promise<BigNumber> {
  if (!ethersProvider || !walletAddress) {
    throw new Error('Cannot wrap ETH without a provider and wallet address')
  }
  // Handle ETH directly
  if (currency.isNative) {
    return await ethersProvider.getBalance(walletAddress)
  }

  // Get currency otherwise
  const walletContract = new ethers.Contract(
    currency.address,
    erc20Abi,
    ethersProvider
  )
  const balance: BigNumber = await walletContract.balanceOf(address)
  return balance
}

async function approvePermit2Contract(erc20Address: string, amount: BigNumber) {
  const erc20 = new ethers.Contract(erc20Address, erc20Abi, ethersSigner);
  const approveTx = await erc20.approve(PERMIT2_ADDRESS, amount);
  console.log('approve tx hash:', approveTx.hash);
  // wait for approve transaction confirmation
  const receipt = await approveTx.wait();
  if (receipt.status === 1) console.log('approve transaction confirmed');
  else throw new Error(receipt);
}

async function getAllowanceAmount(erc20TokenAddress: string, spender: string) {
  const erc20 = new ethers.Contract(erc20TokenAddress, erc20Abi, ethersSigner);
  const allowance = await erc20.allowance(walletAddress, spender);
  return allowance;
}

async function getSwapRoute(
  sourceToken: Token,
  destToken: Token,
  amountInWei: BigNumber,
  permit: Permit2Permit,
  signature: string
) {
  const inputAmount = CurrencyAmount.fromRawAmount(
    sourceToken,
    amountInWei.toString()
  );

  const router = new AlphaRouter({ chainId, provider: ethersProvider });
  const route = await router.route(
    inputAmount,
    destToken,
    TradeType.EXACT_INPUT,
    {
      recipient: walletAddress,
      slippageTolerance: new Percent(5, 1000),
      type: SwapType.UNIVERSAL_ROUTER,
      deadlineOrPreviousBlockhash: Math.floor(Date.now() / 1000 + 600),
      inputTokenPermit: {
        ...permit,
        signature

        // for ROUTER V2
        // r: signature.r,
        // s: signature.s,
        // v: signature.v,
        // for allowance transfer with Router V2
        // expiry: permit.sigDeadline,
        // nonce: permit.details.nonce
        // for signature transfer with Router V2
        // deadline: permit.deadline,
        // amount: permit.permitted.amount
      }
    }
  );
  if (route) {
    console.log(`Quote Exact In: ${amountInWei}  -> ${route.quote.toExact()}`);
  }
  return route;
}

export async function executeSwap() {
  if (!walletAddress) {
    throw new Error('not found wallet address')
  }
  // swap basic info
  // NOTE: not handling native currency swaps here
  const amount = amontSourceToken;

  const amountInWei = ethers.utils.parseUnits(
    amount.toString(),
    sourceToken.decimals
  );
  // expiry for permit & tx confirmation, 30 mins
  const expiry = Math.floor(Date.now() / 1000 + 600);

  // check if we have approved enough amount
  // for PERMIT2 in source token contract
  const allowance = await getAllowanceAmount(
    sourceToken.address,
    PERMIT2_ADDRESS
  );
  console.log('current allowance:', allowance.toString());
  if (allowance.eq(0) || allowance.lt(amountInWei)) {
    // approve permit2 contract for source token
    // NOTE: amount is set to max here
    // NOTE: this will send out approve tx
    // and wait for confirmation
    console.log('sending approve tx to add more allowance');
    await approvePermit2Contract(
      sourceToken.address,
      ethers.constants.MaxInt256
    );
  }

  // allowance provider is part of permit2 sdk
  // using it to get nonce value of last permit
  // we signed for this source token
  const allowanceProvider = new AllowanceProvider(
    ethersProvider,
    PERMIT2_ADDRESS
  );

  // for allowance based transfer we can just use
  // next nonce value for permits.
  // for signature transfer probably it has to be
  // a prime number or something. checks uniswap docs.
  // const nonce = 1;
  const nonce = await allowanceProvider.getNonce(
    sourceToken.address,
    walletAddress,
    uniswapRouterAddress
  );
  console.log('nonce value:', nonce);

  // create permit with SignatureTransfer
  // const permit = {
  //   permitted: {
  //     token: sourceToken.address,
  //     amount: amountInWei
  //   },
  //   spender: uniswapRouterAddress,
  //   nonce,
  //   deadline: expiry
  // };
  // const { domain, types, values } = SignatureTransfer.getPermitData(
  //   permit,
  //   PERMIT2_ADDRESS,
  //   chainId
  // );

  // create permit with AllowanceTransfer
  const permit: any = {
    details: {
      token: sourceToken.address,
      amount: amountInWei,
      expiration: expiry,
      nonce
    },
    spender: uniswapRouterAddress,
    sigDeadline: expiry,
  };
  const { domain, types, values } = AllowanceTransfer.getPermitData(
    permit,
    PERMIT2_ADDRESS,
    chainId
  );

  console.log(JSON.stringify({ domain, types, values }));

  // create signature for permit
  const signature = await ethersSigner._signTypedData(domain, types, values);
  // for V2 router we need to provide v, r, & s from signature.
  // we can split the signature using provider utils
  // const splitSignature = ethers.utils.splitSignature(signature);
  // console.log('split signature:', splitSignature);

  // NOTE: optionally verify the signature
  const address = ethers.utils.verifyTypedData(
    domain,
    types,
    values,
    signature
  );

  console.log({address, walletAddress})

  if (address.toLowerCase() !== walletAddress.toLowerCase())
    throw new Error('signature verification failed');
  else console.log(`signature verified, signed by: ${address}`);

  // get swap route for tokens
  const route = await getSwapRoute(
    sourceToken,
    destToken,
    amountInWei,
    permit,
    signature
  );

  if (!route) {
    throw new Error('Route not found')
  }

  console.log('route calldata:', route.methodParameters?.calldata);

  // create transaction arguments for swap
  const txArguments = {
    data: route.methodParameters?.calldata,
    to: uniswapRouterAddress,
    value: BigNumber.from(route.methodParameters?.value),
    from: walletAddress,
    gasPrice: route.gasPriceWei,
    gasLimit: BigNumber.from('1000000')
  };

  console.log({txArguments})
  // send out swap transaction
  const transaction = await ethersSigner.sendTransaction(txArguments);
  console.log('swap transaction', {
    hash: transaction.hash,
    confirmations: transaction.confirmations,
    gasPrice: transaction.gasPrice
  });
}


export async function getPrice(): Promise<BigNumber | null> {
  const amount = 1;
  const amountInWei = ethers.utils.parseUnits(
    amount.toString(),
    sourceToken.decimals
  );
  const inputAmount = CurrencyAmount.fromRawAmount(
    sourceToken,
    amountInWei.toString()
  );

  const router = new AlphaRouter({ chainId, provider: ethersProvider });
  const route = await router.route(
    inputAmount,
    destToken,
    TradeType.EXACT_INPUT,
    {
      recipient: walletAddress,
      slippageTolerance: new Percent(5, 1000),
      type: SwapType.UNIVERSAL_ROUTER,
      deadlineOrPreviousBlockhash: Math.floor(Date.now() / 1000 + 1800),
    }
  );
  if (route) {
    const routePath = route.route
      .map((r) => r.tokenPath.map((t) => t.symbol).join(' -> '))
      .join(', ')
    console.log({ routePath })

    console.log('Swap: ', `Route: ${amount} ${sourceToken.symbol
      } to ${route.quote.toExact()} ${route.quote.currency.symbol
      } using $${route.estimatedGasUsedUSD.toExact()} worth of gas`)

    return ethers.utils.parseUnits(
      route.quote.toExact(),
      destToken.decimals
     );
  }
  return null
}
// executeSwap();