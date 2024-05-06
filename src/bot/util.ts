import { Context, Format, Markup } from "telegraf";
import { BotContext } from "./context";
import CryptoJS from "crypto-js";
import { Alchemy, Network } from "alchemy-sdk";
import { ethers as ethersNew, isAddress } from "ethers-new";
import { ethers, BigNumber } from "ethers";
import { AlphaRouter, SwapType } from "@uniswap/smart-order-router";
import {
  CurrencyAmount,
  TradeType,
  Percent,
  ChainId,
  Token,
} from "@uniswap/sdk-core";
import { getChainId, getChainRPC, getDAIAddr, getUSDCAddr, getUSDTAddr, getWETHAddr } from "../libs";
import { getDoc, create, getDocRef, getListDocs } from "../libs/firestore";
import { SupportedChain, supportedChains } from "../types";
import { User, Token as TokenModel, Wallet, WalletWhiteList } from "../models";
import { emojs, getExplorer } from "../libs/constants2";
import { FmtString } from "telegraf/typings/format";
import { ExtraEditMessageText, ExtraReplyMessage } from "telegraf/typings/telegram-types";
import _, { chain } from "lodash";
import erc20Abi from "../tokenABI/erc20.json";
import axios from "axios";
import { Message } from "telegraf/typings/core/types/typegram";

const getETHPrice = async () => {
  const resp = await axios
    .get(
      `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd`
    )
    .catch((e) => {
      return {
        data: {
          ethereum: {
            usd: 0,
          },
        },
      };
    });
  return resp.data.ethereum.usd;
};

export const deleteMessage = async (ctx: Context, msgId: number) => {
  return ctx.deleteMessage(msgId).catch((e) => {
    console.log(e);
  });
};

export const reply = async (
  ctx: Context,
  text: string | FmtString,
  extra?: ExtraReplyMessage
) => {
  return ctx.reply(text, extra).catch((e: any) => {
    console.log(e);
  });
};

export const editMessage = async (
  ctx: Context,
  text: string | FmtString,
  msg: Message.TextMessage,
  extra?: ExtraEditMessageText
) => {
  return ctx.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, text, extra).catch((e: any) => {
    console.log(e)
  })
};

export const getCurrentMessageId = (ctx: Context): number | null => {
  let msgId = null;
  if (ctx.message && ctx.message.message_id) {
    msgId = ctx.message.message_id;
  } else if (ctx.callbackQuery?.message?.message_id) {
    msgId = ctx.callbackQuery.message.message_id;
  }
  return msgId;
};

export const deleteMessages = async (
  ctx: Context,
  msgId: number,
  numDelNext: number = 0
) => {
  if (numDelNext > 0) {
    await deleteMessage(ctx, msgId);
    let _countDel = 1;
    while (_countDel <= numDelNext) {
      await deleteMessage(ctx, msgId - _countDel);
      _countDel++;
    }
  } else {
    return deleteMessage(ctx, msgId);
  }
};

export const leaveScene = async (ctx: BotContext) => {
  const msgId = getCurrentMessageId(ctx);
  if (msgId) {
    await deleteMessage(ctx, msgId);
  }
  ctx.scene.reset();
  return ctx.scene.leave();
};

export const leaveSceneStep1 = async (ctx: BotContext) => {
  const msgId = getCurrentMessageId(ctx);
  if (msgId) {
    await deleteMessages(ctx, msgId, 1);
  }
  ctx.scene.reset();
  return ctx.scene.leave();
};

export const leaveSceneStep2 = async (ctx: BotContext) => {
  const msgId = getCurrentMessageId(ctx);
  if (msgId) {
    await deleteMessages(ctx, msgId, 2);
  }
  ctx.scene.reset();
  return ctx.scene.leave();
};

export const leaveSceneStep3 = async (ctx: BotContext) => {
  const msgId = getCurrentMessageId(ctx);
  if (msgId) {
    await deleteMessages(ctx, msgId, 3);
  }
  ctx.scene.reset();
  return ctx.scene.leave();
};

export const leaveSceneStep4 = async (ctx: BotContext) => {
  const msgId = getCurrentMessageId(ctx);
  if (msgId) {
    await deleteMessages(ctx, msgId, 4);
  }
  ctx.scene.reset();
  return ctx.scene.leave();
};

export const deleteLastMessage = async (ctx: Context) => {
  const msgId = getCurrentMessageId(ctx);
  if (msgId) {
    return deleteMessage(ctx, msgId);
  }
};

export const deleteLastMessages = async (
  ctx: Context,
  numMsg: number
): Promise<number | null> => {
  const msgId = getCurrentMessageId(ctx);
  if (msgId) {
    await deleteMessages(ctx, msgId, numMsg - 1);
    return msgId - numMsg;
  }
  return null;
};

export const encrypt = (telegram_id: number, txt: string): string => {
  const _secret = process.env.TTP_EN_KEY;
  if (!_secret) {
    throw new Error("Encrypt key not found");
  }
  if (!telegram_id) {
    throw new Error("User id not found");
  }
  const key = `KEYKEYKEY${telegram_id}_${_secret}`;
  return CryptoJS.AES.encrypt(txt, key).toString();
};

export const decrypt = (telegram_id: number, code: string): string => {
  const _secret = process.env.TTP_EN_KEY;
  if (!_secret) {
    throw new Error("Encrypt key not found");
  }
  if (!telegram_id) {
    throw new Error("User id not found");
  }
  const key = `KEYKEYKEY${telegram_id}_${_secret}`;
  return CryptoJS.AES.decrypt(code, key).toString(CryptoJS.enc.Utf8);
};

export const isVIP = (user: User): boolean => {
  return user.is_vip || user.is_admin;
};

export const getACLAPIKey = (chain: SupportedChain): string | undefined => {
  switch (chain) {
    case "base":
      return process.env.ALC_BASE_KEY;
    case "arbitrum_one":
      return process.env.ALC_ARBITRUM_ONE_KEY;
    case "optimism":
      return process.env.ALC_OPTIMISM_KEY;
    case "polygon":
      return process.env.ALC_POLYGON_KEY;
    case "zora":
      return process.env.ALC_ZORA_KEY;
    default:
      break;
  }
  return undefined;
};

export const getACLNetwork = (chain: SupportedChain): Network | undefined => {
  switch (chain) {
    case "base":
      return Network.BASE_MAINNET;
    case "arbitrum_one":
      return Network.ARB_MAINNET;
    case "optimism":
      return Network.OPT_MAINNET;
    case "polygon":
      return Network.POLYGONZKEVM_MAINNET;
    default:
      break;
  }
  return undefined;
};

const getAlchemy = (chain: SupportedChain) => {
  const _apiKey = getACLAPIKey(chain);
  let netWork = getACLNetwork(chain);
  const _chainId = getChainId(chain);
  if (!_chainId) {
    return null;
  }
  if (_apiKey && netWork) {
    const config = {
      apiKey: _apiKey,
      network: netWork,
    };
    return new Alchemy(config);
  }
  return null;
};

export const getTokenInfo = async (
  chain: SupportedChain,
  tokenAddress: string
) => {
  const _chainId = getChainId(chain);
  if (!_chainId) {
    return null;
  }
  if (isAddress(tokenAddress)) {
    const token: any = await getDoc("tokens", null, [
      {
        field: "address",
        operation: "==",
        value: tokenAddress.toLowerCase(),
      },
      {
        field: "chain_id",
        operation: "==",
        value: _chainId,
      },
    ]);
    if (!token) {
      const alchemy = getAlchemy(chain);
      if (alchemy) {
        // The token address we want to query for metadata
        const tokenMetaData = await alchemy.core
          .getTokenMetadata(tokenAddress)
          .catch((e) => {
            console.log("getTokenMetadata", e);
            return null;
          });
        if (
          tokenMetaData &&
          tokenMetaData.decimals &&
          tokenMetaData.name &&
          tokenMetaData.symbol
        ) {
          const _tokenRef = getDocRef("tokens");
          await create("tokens", _tokenRef.id, {
            ...tokenMetaData,
            chain_id: _chainId,
            address: tokenAddress.toLowerCase(),
            chain,
          });
          return new TokenModel(
            tokenAddress.toLowerCase(),
            tokenMetaData.decimals,
            tokenMetaData.symbol,
            tokenMetaData.name,
            chain,
            _chainId,
            tokenMetaData.logo ? tokenMetaData.logo : undefined,
            _tokenRef.id
          );
        }
      }
      return null;
    } else {
      return new TokenModel(
        tokenAddress.toLowerCase(),
        token.decimals,
        token.symbol,
        token.name,
        chain,
        _chainId,
        token.logo ? token.logo : undefined,
        token.id
      );
    }
  } else {
    const tokens: any = await getListDocs("tokens", [
      {
        field: "symbol",
        operation: "==",
        value: _.replace(tokenAddress, "/", "").toUpperCase(),
      },
      {
        field: "chain_id",
        operation: "==",
        value: _chainId,
      },
    ]);
    if (tokens.length !== 1) {
      return false;
    }
    return new TokenModel(
      tokens[0].address.toLowerCase(),
      tokens[0].decimals,
      tokens[0].symbol,
      tokens[0].name,
      chain,
      _chainId,
      tokens[0].logo ? tokens[0].logo : undefined,
      tokens[0].id
    );
  }
};

export const getRoute = async (
  baseToken: TokenModel,
  quoteToken: TokenModel,
  chain: SupportedChain
) => {
  let chainId = null;
  if (chain) {
    const _chainId = getChainId(chain);
    if (_chainId) {
      chainId = _chainId;
    } else {
      return null;
    }
  } else {
    return null;
  }
  const _rpc = getChainRPC(chain);
  if (!_rpc) {
    return null;
  }
  const amount = 1;
  const ethersProvider = new ethers.providers.JsonRpcProvider(_rpc);
  const amountInWei = ethers.utils.parseUnits(
    amount.toString(),
    baseToken.decimals
  );
  const _baseToken = new Token(
    chainId,
    baseToken.address,
    baseToken.decimals,
    baseToken.symbol,
    baseToken.name
  );
  const inputAmount = CurrencyAmount.fromRawAmount(
    _baseToken,
    amountInWei.toString()
  );

  const router = new AlphaRouter({
    chainId,
    provider: ethersProvider,
  });

  const _quoteToken = new Token(
    chainId,
    quoteToken.address,
    quoteToken.decimals,
    quoteToken.symbol,
    quoteToken.name
  );
  const route = await router.route(
    inputAmount,
    _quoteToken,
    TradeType.EXACT_INPUT,
    {
      recipient: "0x988Db88A91134C1F0704E3cEc110fe819F94CBe9",
      slippageTolerance: new Percent(5, 1000),
      type: SwapType.UNIVERSAL_ROUTER,
      deadlineOrPreviousBlockhash: Math.floor(Date.now() / 1000 + 1800),
    }
  );
  if (route) {
    const routePath = route.route
      .map((r) => r.tokenPath.map((t) => t.symbol).join(" -> "))
      .join(", ");
    // console.log('Swap: ', `Route: ${amount} ${baseToken.symbol
    //   } to ${route.quote.toExact()} ${route.quote.currency.symbol
    //   } using $${route.estimatedGasUsedUSD.toExact()} worth of gas`)
    return {
      path: routePath,
      price: route.quote.toExact(),
    };
  }
  return null;
};

export const getChain = (_chain: string) => {
  let chain: SupportedChain | null = null;
  let chainId: ChainId | null = null;
  switch (_chain) {
    case "base":
      chain = "base";
      chainId = ChainId.BASE;
      break;
    case "mainnet":
      chain = "mainnet";
      chainId = ChainId.MAINNET;
      break;
    case "arbitrum_one":
      chain = "arbitrum_one";
      chainId = ChainId.ARBITRUM_ONE;
      break;
    case "optimism":
      chain = "optimism";
      chainId = ChainId.OPTIMISM;
      break;
    case "bnb":
      chain = "bnb";
      chainId = ChainId.BNB;
      break;
    case "zora":
      chain = "zora";
      chainId = ChainId.ZORA;
      break;
    case "blast":
      chain = "blast";
      chainId = ChainId.BLAST;
      break;
    case "polygon":
      chain = "polygon";
      chainId = ChainId.POLYGON;
      break;
    default:
      break;
  }
  if (chain && chainId) {
    return {
      chain,
      chainId,
    };
  } else {
    return null;
  }
};

export const genTokenLink = (
  symbol: string,
  chain: SupportedChain,
  addr: string
) => {
  if (!symbol || !chain || !addr) {
    return "";
  }
  return Format.link(symbol, `${getExplorer(chain)}/token/${addr}`);
};

export const genAddressLink = (chain: SupportedChain, addr: string) => {
  if (!chain || !addr) {
    return "";
  }
  return Format.link(addr, `${getExplorer(chain)}/address/${addr}`);
};

export const genTxLink = (chain: SupportedChain, txHash: string) => {
  if (!chain || !txHash) {
    return "";
  }
  return Format.link(txHash, `${getExplorer(chain)}/tx/${txHash}`);
};

export const genChainLink = (chain: any) => {
  if (!chain) {
    return "";
  }
  return Format.link(chain.toUpperCase(), `${getExplorer(chain)}`);
};

export const selectChainBtn = (selected?: string | null) => {
  const btns = [];
  const isSelected = selected ? true : false;
  for (const _chain of supportedChains) {
    btns.push([
      Markup.button.callback(
        `${selected && selected === _chain ? emojs.checked : ""} ${_.toUpper(
          _chain
        )}`,
        `${isSelected ? "no_action" : `select_chain_${_chain}`}`
      ),
    ]);
  }
  btns.push([Markup.button.callback(`${emojs.cancel} Cancel`, "cancel")]);
  return Markup.inlineKeyboard(btns);
};

export const selectWalletBtn = (wallets: Wallet[]) => {
  const btns = [];
  for (let i = 0; i < wallets.length; i++) {
    btns.push([
      Markup.button.callback(
        `${emojs.address} ${wallets[i].name.toUpperCase()} - ${wallets[i].wallet
        }`,
        `select_wallet_${wallets[i].wallet}`
      ),
    ]);
  }
  btns.push([Markup.button.callback(`${emojs.cancel} Cancel`, "cancel")]);
  return Markup.inlineKeyboard(btns);
};

export const selectWalletIdBtn = (wallets: Wallet[]) => {
  const btns = [];
  for (let i = 0; i < wallets.length; i++) {
    btns.push([
      Markup.button.callback(
        `${emojs.address} ${wallets[i].name.toUpperCase()} - ${wallets[i].wallet
        }`,
        `select_wallet_${wallets[i].id}`
      ),
    ]);
  }
  btns.push([Markup.button.callback(`${emojs.cancel} Cancel`, "cancel")]);
  return Markup.inlineKeyboard(btns);
};

export const getAllTokenInWallet = async (
  chain: SupportedChain,
  wallet: string
) => {
  const alchemy = getAlchemy(chain);
  if (alchemy && isAddress(wallet)) {
    const balances = await alchemy.core
      .getTokenBalances("0xd63fdE16c98D2b923B020c0727f3EfD3364fDf37")
      .catch((e) => {
        console.log("getTokenBalances", e);
        return null;
      });
    if (!balances) {
      return null;
    }
    // Remove tokens with zero balance
    const nonZeroBalances = balances.tokenBalances.filter((token) => {
      return token.tokenBalance !== "0";
    });
    console.log(`Token balances of ${wallet} \n`);
    // Counter for SNo of final output
    let i = 1;
    // Loop through all tokens with non-zero balance
    for (let token of nonZeroBalances) {
      // Get balance of token
      let balance: any = token.tokenBalance;
      // Get metadata of token
      const metadata = await alchemy.core
        .getTokenMetadata(token.contractAddress)
        .catch((e) => {
          console.log("getTokenMetadata", e);
          return null;
        });
      if (metadata) {
        const { decimals, symbol, name } = metadata;
        if (decimals && symbol && name) {
          // Compute token balance in human-readable format
          balance = balance / Math.pow(10, decimals);
          balance = balance.toFixed(8);
          // Print name, balance, and symbol of token
          console.log(`${i++}. ${name}: ${balance} ${symbol}`);
        }
      }
    }
  }
  return null;
};

export const getBalance = async (
  chain: SupportedChain,
  wallet: string,
  tokenAddress: string,
  isNavite: boolean = false
): Promise<BigNumber | null> => {
  const _rpc = getChainRPC(chain);
  if (!_rpc) {
    return null;
  }
  try {
    const ethersProvider = new ethers.providers.JsonRpcProvider(_rpc);
    // Handle ETH directly
    if (isNavite) {
      return await ethersProvider.getBalance(wallet);
    }
    // Get currency otherwise
    const tokenContract = new ethers.Contract(
      tokenAddress,
      erc20Abi,
      ethersProvider
    );
    const balance: BigNumber = await tokenContract.balanceOf(wallet);
    return balance;
  } catch (error) {
    return null
  }
};

const getProvider = (chain: SupportedChain) => {
  const _rpc = getChainRPC(chain);
  if (!_rpc) {
    return null;
  }
  return new ethers.providers.JsonRpcProvider(_rpc);
};

const getSigner = async (
  telegramId: number,
  chain: SupportedChain,
  walletId: string
) => {
  const ethersProvider = getProvider(chain)
  if (!ethersProvider) {
    return null
  }
  const _wallet: any = await getDoc("wallets", walletId).catch((e) => {
    console.log(e);
  });
  if (!_wallet || !_wallet.private_key) {
    return false;
  }
  const _pri = decrypt(telegramId, _wallet.private_key);
  if (!_pri) {
    return false;
  }
  return new ethers.Wallet(_pri, ethersProvider);
};

export const estimateGasTransfer = async (
  telegramId: number,
  chain: SupportedChain,
  walletId: string,
  tokenAddress: string,
  tokenDecimals: number,
  receiveAddr: string,
  amount: number,
  isNavite: boolean = false
) => {
  const signer = await getSigner(telegramId, chain, walletId);
  if (!signer) {
    return false;
  }
  // Get currency otherwise
  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
  const amountInWei = ethers.utils.parseUnits(amount.toString(), tokenDecimals);
  const gasPrice = await signer.getGasPrice();
  const estimation = await tokenContract.estimateGas.transfer(
    receiveAddr,
    amountInWei
  );
  const txPriceWei = gasPrice.mul(estimation);
  const txPriceEth = ethers.utils.formatEther(txPriceWei);
  const priceETH = await getETHPrice();
  const txPriceUSD = parseFloat(txPriceEth) * priceETH;
  return {
    txPriceUSD: txPriceUSD.toFixed(2),
    txPriceEth: parseFloat(txPriceEth).toFixed(8),
  };
};

export const selectWalletWLBtn = (wallets: WalletWhiteList[]) => {
  const btns = [];
  for (let i = 0; i < wallets.length; i++) {
    btns.push([
      Markup.button.callback(
        `${emojs.address} ${wallets[i].name.toUpperCase()} - ${wallets[i].wallet
        }`,
        `swlw_${wallets[i].wallet}`
      ),
    ]);
  }
  btns.push([Markup.button.callback(`${emojs.cancel} Cancel`, "cancel")]);
  return Markup.inlineKeyboard(btns);
};

export const getTeleUser = async (ctx: BotContext) => {
  const teleUser = ctx.from;
  if (!teleUser) {
    await reply(ctx, "User not found");
    return ctx.scene.leave();
  }
  return teleUser;
};

export const getUserByTeleId = (teleId: number) => {
  return getDoc("users", null, [
    {
      field: "telegram_id",
      operation: "==",
      value: teleId,
    },
  ]);
};

export const transferERC20 = async (
  ctx: BotContext,
  telegramId: number,
  chain: SupportedChain,
  walletId: string,
  tokenAddress: string,
  tokenDecimals: number,
  toAddress: string,
  amount: number
) => {
  const provider = getProvider(chain)
  if (!provider) {
    return false
  }
  const amountInWei = ethers.utils.parseUnits(amount.toString(), tokenDecimals);
  const signer = await getSigner(telegramId, chain, walletId);
  if (!signer) {
    return false;
  }
  // Get currency otherwise
  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);

  //Define the data parameter
  const data = tokenContract.interface.encodeFunctionData("transfer", [
    toAddress,
    amountInWei,
  ]);
  try {
    const tx = await signer.sendTransaction({
      to: tokenAddress,
      from: signer.address,
      value: ethers.utils.parseUnits("0.000", "ether"),
      data: data,
    });
    const msg = await reply(ctx, Format.fmt`${emojs.loading} Mining transaction...: ${genTxLink(chain, tx.hash)}`)
    const receipt = await tx.wait(6);
    if (msg) {
      await deleteMessage(ctx, msg.message_id)
    }
    console.log({ receipt });
    if (receipt.status === 1) {
      await reply(ctx, Format.fmt`${emojs.checked} Transfer successfull: ${genTxLink(chain, tx.hash)}`)
      console.log("transaction", {
        transactionHash: receipt.transactionHash,
        blockHash: receipt.blockHash,
        confirmations: receipt.confirmations,
        cumulativeGasUsed: receipt.cumulativeGasUsed.toHexString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toHexString(),
        gasUsed: receipt.gasUsed.toString(),
        logs: JSON.stringify(receipt.logs),
      });
      return true;
    } else {
      await reply(ctx, `${emojs.error} 'Transfer error'`);
      return false;
    }
  } catch (error: any) {
    await reply(ctx, `${emojs.error} ${error.message}`);
    return false;
  }
};


export const selectTokenBtn = (chain: SupportedChain) => {
  const btns = [];
  const chainId = getChainId(chain)
  const tokens = []
  if (chainId) {
    const weth = getWETHAddr(chainId)
    if (weth) {
      tokens.push({ name: 'WETH', address: weth })
    }
    const usdt = getUSDTAddr(chainId)
    if (usdt) {
      tokens.push({ name: 'USDT', address: usdt })
    }
    const usdc = getUSDCAddr(chainId)
    if (usdc) {
      tokens.push({ name: 'USDC', address: usdc })
    }
    const dai = getDAIAddr(chainId)
    if (dai) {
      tokens.push({ name: 'DAI', address: dai })
    }
  }
  if (tokens.length > 0) {
    for (let i = 0; i < tokens.length; i++) {
      btns.push([
        Markup.button.callback(
          `${emojs.address} ${tokens[i].name} - ${tokens[i].address
          }`,
          `stkn_${tokens[i].address}`
        ),
      ]);
    }
  }
  btns.push([Markup.button.callback(`${emojs.cancel} Cancel`, "cancel")]);
  return Markup.inlineKeyboard(btns);
};
