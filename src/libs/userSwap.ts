import { ethers, BigNumber } from "ethers";
import { ethers as ethersNew } from 'ethers-new'
import {
  PERMIT2_ADDRESS,
  AllowanceTransfer,
  AllowanceProvider,
} from "@uniswap/permit2-sdk";
import { AlphaRouter, SwapType } from "@uniswap/smart-order-router";
import {
  CurrencyAmount,
  TradeType,
  Percent,
  ChainId,
  Token,
  SWAP_ROUTER_02_ADDRESSES,
} from "@uniswap/sdk-core";
import { Permit2Permit } from "@uniswap/universal-router-sdk/dist/utils/inputTokens";
import erc20Abi from "../tokenABI/erc20.json";
import { Token as OrderToken } from "../models";
import { getChainId, getChainRPC } from "./utils";
import { getDoc, updateDoc } from "./firestore";
import _ from "lodash";
import { UNIVERSAL_ROUTER_ADDRESS } from "@uniswap/universal-router-sdk";
import JSBI from "jsbi";
import { convertTargetPrice } from "./conversion";
import { Format, Telegraf } from "telegraf";
import { BotContext } from "../bot";
import { getExplorer } from "./constants2";
import { decrypt } from "../bot/util";
import { SupportedChain } from "../types";

export class UserSwap {
  orderId: string;
  walletId: string;
  chain: SupportedChain;
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

  constructor(
    orderId: string,
    walletId: string,
    chain: SupportedChain,
    tokenIn: OrderToken,
    tokenOut: OrderToken,
    userId: string,
    walletAddress: string,
    tokenInAmount: number,
    targetPrice: number,
    bot: Telegraf<BotContext>,
    telegram_id: number
  ) {
    this.chain = chain;
    this.bot = bot;
    this.telegram_id = telegram_id;
    if (chain) {
      const _chainId = getChainId(chain);
      if (_chainId) {
        this.chainId = _chainId;
      } else {
        this.notify("ChainId is not supported")
        throw new Error("Chain is not supported");
      }
    } else {
      this.notify("ChainId not found")
      throw new Error("Chain is not supported");
    }
    const _rpc = getChainRPC(chain);
    if (!_rpc) {
      this.notify("RPC not found")
      throw new Error("RPC not found");
    }
    this.orderId = orderId;
    this.walletId = walletId;
    this.tokenInAmount = tokenInAmount;
    this.targetPrice = targetPrice;
    this.userId = userId;
    this.walletAddress = walletAddress;
    this.uniswapRouterAddress =
      process.env.UNISWAP_ROUTER === "UNIVERSAL"
        ? UNIVERSAL_ROUTER_ADDRESS(this.chainId)
        : SWAP_ROUTER_02_ADDRESSES(this.chainId);

    this.tokenIn = new Token(
      this.chainId,
      tokenIn.address,
      tokenIn.decimals,
      tokenIn.symbol,
      tokenIn.name
    );
    this.tokenOut = new Token(
      this.chainId,
      tokenOut.address,
      tokenOut.decimals,
      tokenOut.symbol,
      tokenOut.name
    );
    this.ethersProvider = new ethers.providers.JsonRpcProvider(_rpc);
  }

  async setup(): Promise<boolean> {
    const _wallet: any = await getDoc("wallets", this.walletId).catch(e => {
      console.log(e)
    });
    if (!_wallet || !_wallet.private_key) {
      return false;
    }
    const _pri = decrypt(this.telegram_id, _wallet.private_key);
    if (!_pri) {
      this.notify("PRIVATE KEY NOT FOUND")
      return false;
    }
    try {
      this.ethersSigner = new ethers.Wallet(_pri, this.ethersProvider);
    } catch (error) {
      this.notify("PRIVATE KEY INVALID")
      return false;
    }

    const balance = await this.getSwap2CurrencyBalance();
    const bigZero = JSBI.BigInt(0);
    if (JSBI.EQ(balance, bigZero)) {
      this.notify(`No ${this.tokenIn.symbol} token in wallet ${this.walletAddress}, So the order will be deactived!`)
      await updateDoc("orders", this.orderId, { is_active: false })
      return false;
    }
    const bigTarget = JSBI.BigInt(
      convertTargetPrice(this.targetPrice, this.tokenOut.decimals)
    );
    const price = await this.getPrice();
    if (!price) {
      return false;
    }
    if (JSBI.LT(price, bigTarget)) {
      return false;
    }
    return true;
  }

  async notify(msg: any) {
    return this.bot.telegram.sendMessage(this.telegram_id, msg).catch(e => {
      console.log(e)
    })
  }

  async getSwap2CurrencyBalance(): Promise<BigNumber> {
    // Handle ETH directly
    if (this.tokenIn.isNative) {
      return await this.ethersProvider.getBalance(this.walletAddress);
    }
    // Get currency otherwise
    const walletContract = new ethers.Contract(
      this.tokenIn.address,
      erc20Abi,
      this.ethersProvider
    );
    const balance: BigNumber = await walletContract.balanceOf(
      this.walletAddress
    );
    return balance;
  }

  async approvePermit2Contract(amount: BigNumber) {
    const erc20 = new ethers.Contract(
      this.tokenIn.address,
      erc20Abi,
      this.ethersSigner
    );
    const approveTx = await erc20.approve(PERMIT2_ADDRESS, amount);
    this.notify(Format.fmt`Approve tx hash: ${Format.link(
      approveTx.hash,
      `${getExplorer(this.chain)}/tx/${approveTx.hash}`
    )}`)

    // wait for approve transaction confirmation
    const receipt = await approveTx.wait();
    if (receipt.status === 1) {
      this.notify("Approve transaction confirmed")
    }
    else {
      throw new Error(receipt);
    }
  }

  async getAllowanceAmount(spender: string) {
    const erc20 = new ethers.Contract(
      this.tokenIn.address,
      erc20Abi,
      this.ethersSigner
    );
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

    const router = new AlphaRouter({
      chainId: this.chainId,
      provider: this.ethersProvider,
    });
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
          signature,
        },
      }
    );
    if (route) {
      console.log(
        `Quote Exact In: ${amountInWei}  -> ${route.quote.toExact()}`
      );
    }
    return route;
  }

  async executeSwap(): Promise<boolean> {
    if (!this.ethersSigner) {
      return false;
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
    if (allowance.eq(0) || allowance.lt(amountInWei)) {
      this.notify("sending approve tx to add more allowance")
      await this.approvePermit2Contract(ethers.constants.MaxInt256);
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
        nonce,
      },
      spender: this.uniswapRouterAddress,
      sigDeadline: expiry,
    };
    const { domain, types, values } = AllowanceTransfer.getPermitData(
      permit,
      PERMIT2_ADDRESS,
      this.chainId
    );

    // create signature for permit
    const signature = await this.ethersSigner._signTypedData(
      domain,
      types,
      values
    );
    // NOTE: optionally verify the signature
    const address = ethers.utils.verifyTypedData(
      domain,
      types,
      values,
      signature
    );

    if (address.toLowerCase() !== this.walletAddress.toLowerCase()) {
      this.notify("signature verification failed")
      return false
    } else {
      console.log(`signature verified, signed by: ${address}`);
    }

    // get swap route for tokens
    const route = await this.getSwapRoute(amountInWei, permit, signature);

    if (!route) {
      this.notify("Route not found")
      return false
    }

    // create transaction arguments for swap
    const txArguments = {
      data: route.methodParameters?.calldata,
      to: this.uniswapRouterAddress,
      value: BigNumber.from(route.methodParameters?.value),
      from: this.walletAddress,
      gasPrice: route.gasPriceWei,
      gasLimit: BigNumber.from("1000000"),
    };

    console.log({ txArguments });

    // send out swap transaction
    const swapTx = await this.ethersSigner.sendTransaction(txArguments);
    this.notify(Format.fmt`Swap tx hash: ${Format.link(
      swapTx.hash,
      `${getExplorer(this.chain)}/tx/${swapTx.hash}`
    )}`)
    // wait for approve transaction confirmation
    const receipt = await swapTx.wait(6);
    console.log({ receipt });
    if (receipt.status === 1) {
      this.notify("Swap transaction confirmed")
      console.log("swap transaction", {
        transactionHash: receipt.transactionHash,
        blockHash: receipt.blockHash,
        confirmations: receipt.confirmations,
        cumulativeGasUsed: receipt.cumulativeGasUsed.toHexString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toHexString(),
        gasUsed: receipt.gasUsed.toString(),
        logs: JSON.stringify(receipt.logs),
      });
      await updateDoc("orders", this.orderId, { is_filled: true, transaction_hash: receipt.transactionHash })
      return true;
    } else {
      this.notify("Transaction error")
      return false;
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

    const router = new AlphaRouter({
      chainId: this.chainId,
      provider: this.ethersProvider,
    });
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
      return ethers.utils.parseUnits(
        route.quote.toExact(),
        this.tokenOut.decimals
      );
    }
    return null;
  }

  parseSwapLog(logs: object[], tokenIn: Token, tokenOut: Token) {
    const swapEventTopic = ethersNew.id('Swap(address,address,int256,int256,uint160,uint128,int24)')
    const swapLogs = logs.filter(log => {
      if ('topics' in log && _.isArray(log.topics)) {
        return log.topics[0] === swapEventTopic
      }
    });
    // take the last swap event
    const lastSwapEvent = swapLogs.slice(-1)[0]
    // // decode the data
    const swapInterface = new ethersNew.Interface('[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":true,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"int256","name":"amount0","type":"int256"},{"indexed":false,"internalType":"int256","name":"amount1","type":"int256"},{"indexed":false,"internalType":"uint160","name":"sqrtPriceX96","type":"uint160"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"int24","name":"tick","type":"int24"}],"name":"Swap","type":"event"}]')

    if ('topics' in lastSwapEvent && 'data' in lastSwapEvent && lastSwapEvent.topics && _.isArray(lastSwapEvent.topics) && lastSwapEvent.data && _.isString(lastSwapEvent.data)) {
      const parsed = swapInterface.parseLog({
        topics: lastSwapEvent.topics,
        data: lastSwapEvent.data,
      });
      const tokenInAmount = ethersNew.formatUnits(parsed?.args.amount1, tokenIn.decimals)
      const tokenOutAmount = ethersNew.formatUnits(parsed?.args.amount0, tokenOut.decimals)
      return {
        tokenInAmount, tokenOutAmount
      }
    } else {
      return false
    }
    // // use the non zero value
    // const receivedTokens = parsed.args.amount0Out.isZero() ?  parsed.args.amount1Out : parsed.args.amount0Out;


  }
}
