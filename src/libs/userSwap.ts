import { ethers, BigNumber } from 'ethers';
import {
  PERMIT2_ADDRESS,
  AllowanceTransfer,
  AllowanceProvider
} from '@uniswap/permit2-sdk';
import { AlphaRouter, SwapType } from '@uniswap/smart-order-router';
import { CurrencyAmount, TradeType, Percent, ChainId, Token, SWAP_ROUTER_02_ADDRESSES } from '@uniswap/sdk-core';
import { Permit2Permit } from '@uniswap/universal-router-sdk/dist/utils/inputTokens';
import erc20Abi from '../tokenABI/erc20.json'
import { Token as OrderToken } from '../bot/orders'
import { SupportedChain } from './types';
import { getChainId, getChainRPC } from './utils';
import { getDoc } from './firestore';
import _ from 'lodash';
import { UNIVERSAL_ROUTER_ADDRESS } from '@uniswap/universal-router-sdk';
import JSBI from 'jsbi';
import { convertTargetPrice } from './conversion';
import { Telegraf } from 'telegraf';
import { BotContext } from '../bot';


export class UserSwap {
  chain: string;
  chainId: ChainId;
  tokenIn: Token;
  tokenOut: Token;
  tokenInAmount: number;
  targetPrice: number;
  ethersProvider: ethers.providers.JsonRpcProvider;
  ethersSigner?: ethers.Wallet;
  userId: string;
  walletAddress: string;
  uniswapRouterAddress: string;
  bot: Telegraf<BotContext>;
  telegram_id: number;

  constructor(chain: SupportedChain, tokenIn: OrderToken, tokenOut: OrderToken, userId: string, walletAddress: string, tokenInAmount: number, targetPrice: number, bot: Telegraf<BotContext>, telegram_id: number) {
    this.chain = chain;
    if (chain) {
      const _chainId = getChainId(chain)
      if (_chainId) {
        this.chainId = _chainId
      } else {
        throw new Error('Chain not supported')
      }
    } else {
      throw new Error('Chain not supported')
    }
    const _rpc = getChainRPC(chain)
    if (!_rpc) {
      throw new Error('RPC not found')
    }
    this.tokenInAmount = tokenInAmount
    this.targetPrice = targetPrice
    this.userId = userId
    this.walletAddress = walletAddress
    this.uniswapRouterAddress = process.env.UNISWAP_ROUTER === 'UNIVERSAL' ? UNIVERSAL_ROUTER_ADDRESS(this.chainId) : SWAP_ROUTER_02_ADDRESSES(this.chainId);

    this.tokenIn = new Token(this.chainId, tokenIn.address, tokenIn.decimals, tokenIn.symbol, tokenIn.name)
    this.tokenOut = new Token(this.chainId, tokenOut.address, tokenOut.decimals, tokenOut.symbol, tokenOut.name)
    this.ethersProvider = new ethers.providers.JsonRpcProvider(_rpc);
    this.bot = bot
    this.telegram_id = telegram_id
  }

  async setup(): Promise<boolean> {
    const _wallet = await getDoc('wallets', null, [
      {
        field: 'user_id', operation: '==', value: this.userId
      },
      {
        field: 'wallet', operation: '==', value: this.walletAddress
      }
    ])
    if (!_wallet) {
      return false
    }
    const _pri = _.get(process.env, `WALLET_${_wallet.id}_PRIVATE_KEY`)
    if (!_pri) {
      this.bot.telegram.sendMessage(this.telegram_id, 'PRIVATE KEY NOT FOUND')
      return false
    }
    try {
      this.ethersSigner = new ethers.Wallet(_pri, this.ethersProvider);
    } catch (error) {
      this.bot.telegram.sendMessage(this.telegram_id, 'PRIVATE KEY INVALID')
      return false
    }

    const balance = await this.getSwap2CurrencyBalance();
    const bigZero = JSBI.BigInt(0);
    if (JSBI.EQ(balance, bigZero)) {
      return false
    }
    const bigTarget = JSBI.BigInt(convertTargetPrice(this.targetPrice, this.tokenOut.decimals));
    const price = await this.getPrice();
    if (!price) {
      return false
    }
    if (JSBI.LT(price, bigTarget)) {
      return false
    }
    return true
  }

  async getSwap2CurrencyBalance(): Promise<BigNumber> {
    // Handle ETH directly
    if (this.tokenIn.isNative) {
      return await this.ethersProvider.getBalance(this.walletAddress)
    }
    // Get currency otherwise
    const walletContract = new ethers.Contract(
      this.tokenIn.address,
      erc20Abi,
      this.ethersProvider
    )
    const balance: BigNumber = await walletContract.balanceOf(this.walletAddress)
    return balance
  }

  async approvePermit2Contract(amount: BigNumber) {
    const erc20 = new ethers.Contract(this.tokenIn.address, erc20Abi, this.ethersSigner);
    const approveTx = await erc20.approve(PERMIT2_ADDRESS, amount);
    console.log('approve tx hash:', approveTx.hash);
    // wait for approve transaction confirmation
    const receipt = await approveTx.wait();
    if (receipt.status === 1) console.log('approve transaction confirmed');
    else throw new Error(receipt);
  }

  async getAllowanceAmount(spender: string) {
    const erc20 = new ethers.Contract(this.tokenIn.address, erc20Abi, this.ethersSigner);
    const allowance = await erc20.allowance(this.walletAddress, spender);
    return allowance;
  }

  async getSwapRoute(
    amountInWei: BigNumber,
    permit: Permit2Permit,
    signature: string
  ) {
    const inputAmount = CurrencyAmount.fromRawAmount(
      this.tokenIn,
      amountInWei.toString()
    );

    const router = new AlphaRouter({ chainId: this.chainId, provider: this.ethersProvider });
    const route = await router.route(
      inputAmount,
      this.tokenOut,
      TradeType.EXACT_INPUT,
      {
        recipient: this.walletAddress,
        slippageTolerance: new Percent(5, 1000),
        type: SwapType.UNIVERSAL_ROUTER,
        deadlineOrPreviousBlockhash: Math.floor(Date.now() / 1000 + 600),
        inputTokenPermit: {
          ...permit,
          signature
        }
      }
    );
    if (route) {
      console.log(`Quote Exact In: ${amountInWei}  -> ${route.quote.toExact()}`);
    }
    return route;
  }

  async executeSwap(): Promise<boolean> {
    if (!this.ethersSigner) {
      return false
    }
    // swap basic info
    // NOTE: not handling native currency swaps here
    const amount = this.tokenInAmount;

    const amountInWei = ethers.utils.parseUnits(
      amount.toString(),
      this.tokenIn.decimals
    );
    // expiry for permit & tx confirmation, 30 mins
    const expiry = Math.floor(Date.now() / 1000 + 600);

    // check if we have approved enough amount
    // for PERMIT2 in source token contract
    const allowance = await this.getAllowanceAmount(PERMIT2_ADDRESS);
    console.log('current allowance:', allowance.toString());
    if (allowance.eq(0) || allowance.lt(amountInWei)) {
      // approve permit2 contract for source token
      // NOTE: amount is set to max here
      // NOTE: this will send out approve tx
      // and wait for confirmation
      console.log('sending approve tx to add more allowance');
      await this.approvePermit2Contract(
        ethers.constants.MaxInt256
      );
    }

    // allowance provider is part of permit2 sdk
    // using it to get nonce value of last permit
    // we signed for this source token
    const allowanceProvider = new AllowanceProvider(
      this.ethersProvider,
      PERMIT2_ADDRESS
    );

    // for allowance based transfer we can just use
    // next nonce value for permits.
    // for signature transfer probably it has to be
    // a prime number or something. checks uniswap docs.
    // const nonce = 1;
    const nonce = await allowanceProvider.getNonce(
      this.tokenIn.address,
      this.walletAddress,
      this.uniswapRouterAddress
    );

    // create permit with AllowanceTransfer
    const permit: any = {
      details: {
        token: this.tokenIn.address,
        amount: amountInWei,
        expiration: expiry,
        nonce
      },
      spender: this.uniswapRouterAddress,
      sigDeadline: expiry,
    };
    const { domain, types, values } = AllowanceTransfer.getPermitData(
      permit,
      PERMIT2_ADDRESS,
      this.chainId
    );

    console.log(JSON.stringify({ domain, types, values }));

    // create signature for permit
    const signature = await this.ethersSigner._signTypedData(domain, types, values);
    // NOTE: optionally verify the signature
    const address = ethers.utils.verifyTypedData(
      domain,
      types,
      values,
      signature
    );

    if (address.toLowerCase() !== this.walletAddress.toLowerCase())
      throw new Error('signature verification failed');
    else console.log(`signature verified, signed by: ${address}`);

    // get swap route for tokens
    const route = await this.getSwapRoute(
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
      to: this.uniswapRouterAddress,
      value: BigNumber.from(route.methodParameters?.value),
      from: this.walletAddress,
      gasPrice: route.gasPriceWei,
      gasLimit: BigNumber.from('1000000')
    };

    console.log({ txArguments })
    // send out swap transaction
    const swapTx = await this.ethersSigner.sendTransaction(txArguments);
    console.log('Swap tx hash:', swapTx.hash);
    // wait for approve transaction confirmation
    const receipt = await swapTx.wait(6);
    console.log({ receipt })
    if (receipt.status === 1) {
      console.log('Swap transaction confirmed');
      console.log('swap transaction', {
        transactionHash: receipt.transactionHash,
        blockHash: receipt.blockHash,
        confirmations: receipt.confirmations,
        cumulativeGasUsed: receipt.cumulativeGasUsed.toHexString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toHexString(),
        gasUsed: receipt.gasUsed.toString(),
        logs: JSON.stringify(receipt.logs)
      });
      return true
    } else {
      console.log('transction error');
      return false
    }
  }

  async getPrice(): Promise<BigNumber | null> {
    const amount = 1;
    const amountInWei = ethers.utils.parseUnits(
      amount.toString(),
      this.tokenIn.decimals
    );
    const inputAmount = CurrencyAmount.fromRawAmount(
      this.tokenIn,
      amountInWei.toString()
    );

    const router = new AlphaRouter({ chainId: this.chainId, provider: this.ethersProvider });
    const route = await router.route(
      inputAmount,
      this.tokenOut,
      TradeType.EXACT_INPUT,
      {
        recipient: this.walletAddress,
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

      console.log('Swap: ', `Route: ${amount} ${this.tokenIn.symbol
        } to ${route.quote.toExact()} ${route.quote.currency.symbol
        } using $${route.estimatedGasUsedUSD.toExact()} worth of gas`)

      return ethers.utils.parseUnits(
        route.quote.toExact(),
        this.tokenOut.decimals
      );
    }
    return null
  }
}
