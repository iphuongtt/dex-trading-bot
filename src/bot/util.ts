import { Context } from "telegraf"
import { BotContext } from "./context"
import CryptoJS from 'crypto-js'
import { Alchemy, Network } from "alchemy-sdk";
import { ethers as ethersNew } from "ethers-new"
import { ethers } from "ethers";
import { AlphaRouter, SwapType } from "@uniswap/smart-order-router";
import {
  CurrencyAmount,
  TradeType,
  Percent,
  ChainId,
  Token,
  SWAP_ROUTER_02_ADDRESSES,
} from "@uniswap/sdk-core";
import { getChainId, getChainRPC } from "../libs"
import { getDoc, create } from "../libs/firestore"
import { SupportedChain } from "../types";
import { User, Token as TokenModel } from "../models";

export const deleteMessage = async (ctx: Context, msgId: number) => {
  return ctx.deleteMessage(msgId).catch(e => {
    console.log(e)
  })
}

export const getCurrentMessageId = (ctx: Context): number | null => {
  let msgId = null
  if (ctx.message && ctx.message.message_id) {
    msgId = ctx.message.message_id
  } else if (ctx.callbackQuery?.message?.message_id) {
    msgId = ctx.callbackQuery.message.message_id
  }
  return msgId
}


export const deleteMessages = async (ctx: Context, msgId: number, numDelNext: number = 0) => {
  if (numDelNext > 0) {
    await deleteMessage(ctx, msgId)
    let _countDel = 1;
    while (_countDel <= numDelNext) {
      await deleteMessage(ctx, msgId - _countDel)
      _countDel++
    }
  } else {
    return deleteMessage(ctx, msgId)
  }
}


export const leaveScene = async (ctx: BotContext) => {
  const msgId = getCurrentMessageId(ctx)
  if (msgId) {
    await deleteMessage(ctx, msgId)
  }
  ctx.scene.reset()
  return ctx.scene.leave()
}

export const leaveSceneStep1 = async (ctx: BotContext) => {
  const msgId = getCurrentMessageId(ctx)
  if (msgId) {
    await deleteMessages(ctx, msgId, 1)
  }
  ctx.scene.reset()
  return ctx.scene.leave()
}

export const leaveSceneStep2 = async (ctx: BotContext) => {
  const msgId = getCurrentMessageId(ctx)
  if (msgId) {
    await deleteMessages(ctx, msgId, 2)
  }
  ctx.scene.reset()
  return ctx.scene.leave()
}

export const leaveSceneStep3 = async (ctx: BotContext) => {
  const msgId = getCurrentMessageId(ctx)
  if (msgId) {
    await deleteMessages(ctx, msgId, 3)
  }
  ctx.scene.reset()
  return ctx.scene.leave()
}

export const leaveSceneStep4 = async (ctx: BotContext) => {
  const msgId = getCurrentMessageId(ctx)
  if (msgId) {
    await deleteMessages(ctx, msgId, 4)
  }
  ctx.scene.reset()
  return ctx.scene.leave()
}

export const deleteLastMessage = async (ctx: Context) => {
  const msgId = getCurrentMessageId(ctx);
  if (msgId) {
    return deleteMessage(ctx, msgId)
  }
}

export const encrypt = (telegram_id: number, txt: string): string => {
  const _secret = process.env.TTP_EN_KEY
  if (!_secret) {
    throw new Error('Encrypt key not found')
  }
  if (!telegram_id) {
    throw new Error('User id not found')
  }
  const key = `KEYKEYKEY${telegram_id}_${_secret}`
  return CryptoJS.AES.encrypt(txt, key).toString()
}

export const decrypt = (telegram_id: number, code: string): string => {
  const _secret = process.env.TTP_EN_KEY
  if (!_secret) {
    throw new Error('Encrypt key not found')
  }
  if (!telegram_id) {
    throw new Error('User id not found')
  }
  const key = `KEYKEYKEY${telegram_id}_${_secret}`
  return CryptoJS.AES.decrypt(code, key).toString(CryptoJS.enc.Utf8)
}

export const isVIP = (user: User): boolean => {
  return user.is_vip || user.is_admin
}

export const getACLAPIKey = (chain: SupportedChain): string | undefined => {
  switch (chain) {
    case 'base':
      return process.env.ALC_BASE_KEY
      break;
    default:
      break;
  }
  return undefined
}

export const getTokenInfo = async (chain: SupportedChain, tokenAddress: string) => {
  const _apiKey = getACLAPIKey(chain)
  let netWork = null
  switch (chain) {
    case 'base':
      netWork = Network.BASE_MAINNET
      break;
    default:
      break;
  }
  const _chainId = getChainId(chain);
  if (!_chainId) {
    return null
  }
  if (_apiKey && netWork) {
    const token: any = await getDoc("tokens", null, [
      {
        field: 'address', operation: '==', value: tokenAddress
      },
      {
        field: 'chain_id', operation: '==', value: _chainId
      }
    ])
    console.log({token})
    if (!token) {
      const config = {
        apiKey: _apiKey,
        network: netWork,
      };
      const alchemy = new Alchemy(config);
      // The token address we want to query for metadata
      const tokenMetaData = await alchemy.core.getTokenMetadata(
        tokenAddress
      )
      if (tokenMetaData.decimals && tokenMetaData.name && tokenMetaData.symbol) {
        await create('tokens', null, tokenMetaData)
        return new TokenModel(tokenAddress, tokenMetaData.decimals, tokenMetaData.symbol, tokenMetaData.name, chain, _chainId, tokenMetaData.logo ? tokenMetaData.logo : undefined)
      }
      return null
    } else {
      return new TokenModel(tokenAddress, token.decimals, token.symbol, token.name, chain, _chainId, token.logo ? token.logo : undefined)
    }
  }
  return null
}


export const getRoute = async (baseToken: Token, quoteToken: Token, chain: SupportedChain): Promise<boolean> => {
  let chainId = null
  if (chain) {
    const _chainId = getChainId(chain);
    if (_chainId) {
      chainId = _chainId;
    } else {
      return false
    }
  } else {
    return false
  }
  const _rpc = getChainRPC(chain);
  if (!_rpc) {
    return false
  }
  const amount = 1;
  const ethersProvider = new ethers.providers.JsonRpcProvider(_rpc);
  const amountInWei = ethers.utils.parseUnits(
    amount.toString(),
    baseToken.decimals
  );
  const inputAmount = CurrencyAmount.fromRawAmount(
    baseToken,
    amountInWei.toString()
  );

  const router = new AlphaRouter({
    chainId,
    provider: ethersProvider,
  });
  const route = await router.route(
    inputAmount,
    quoteToken,
    TradeType.EXACT_INPUT,
    {
      recipient: '0x988Db88A91134C1F0704E3cEc110fe819F94CBe9',
      slippageTolerance: new Percent(5, 1000),
      type: SwapType.UNIVERSAL_ROUTER,
      deadlineOrPreviousBlockhash: Math.floor(Date.now() / 1000 + 1800),
    }
  );
  if (route) {
    return true
  }
  return false;
}
