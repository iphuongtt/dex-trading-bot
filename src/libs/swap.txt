import { BigNumber, ContractInterface, Wallet, ethers } from 'ethers'
import { UniswapTrade, PERMIT2_ADDRESS } from "@uniswap/universal-router-sdk";
import { AllowanceTransfer, PermitSingle } from '@uniswap/permit2-sdk'
import {
    AlphaRouter,
    SwapOptionsUniversalRouter,
    SwapOptions,
    SwapRoute,
    SwapType,
    MAX_UINT160,
  } from '@uniswap/smart-order-router'
import JSBI from "jsbi";
import { getMainnetChainId, getMainnetProvider, getProvider, getWallet } from "./providers";
import { fromReadableAmount } from './conversion'
import { CurrentConfig } from '../config';
import { TradeType, CurrencyAmount, Percent, Token, ChainId } from '@uniswap/sdk-core'
import moment from 'moment';
import { getRouterAddress } from './router';
import { nativeOnChain } from '@uniswap/smart-order-router';
import { DEFAULT_GAS_LIMIT } from './constants';

const provider = getMainnetProvider()
const signer = getWallet()
const chainId = getMainnetChainId()


function getChainWiseNativeToken() {
    return '0x4200000000000000000000000000000000000006'
}

async function getTokenTransferApproval(tokenAddress: string, decimals: number, amount: number) {
    if(!provider) {
        throw new Error('')
    }    
  
    try {
      const tokenContract = new ethers.Contract(tokenAddress, CurrentConfig.tokens.tokenInABI, signer);
      const allowance = await tokenContract.allowance(
        signer.address,
        PERMIT2_ADDRESS
      );
  
      if (allowance.gte(ethers.BigNumber.from(fromReadableAmount(amount, +decimals)))) {
        return true;
      }
  
      console.log("Approving token...");
  
      const transaction = await tokenContract.approve(
        PERMIT2_ADDRESS,
        ethers.constants.MaxUint256
      );
  
      const receipt = await transaction.wait();
  
      if (receipt.status === 0) {
        console.log("Approval transaction failed");
        return false;
      }
  
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }


  const verifySignature = (signature: PermitSingle, token_A: Token) => {
    const { details, sigDeadline } = signature;
  
    if (details.token.toLowerCase() !== token_A.address.toLowerCase()) {
      return false;
    }
  
    if (moment().isAfter(moment.unix(parseInt(sigDeadline.toString())))) {
      return false;
    }
  
    return true;
  };


  export const makePermit = (tokenAddress: string, amount: string, nonce: number) => {
    return {
      details: {
        token: tokenAddress,
        amount,
        expiration: moment().add(1, "month").unix().toString(),
        nonce,
      },
      spender: getRouterAddress(),
      sigDeadline: moment().add(30, "minutes").unix().toString(),
    };
  };


  export async function generatePermitSignature(permit: PermitSingle) {
    const { domain, types, values } = AllowanceTransfer.getPermitData(
      permit,
      PERMIT2_ADDRESS,
      chainId
    );
  
    try {
      const signature = await signer._signTypedData(domain, types, values);
      return signature;
    } catch (e) {
      console.log(e?.message);
      return null;
    }
  }



  const getQuote = async (
    amount, // amount of input token you want to swap
    tokenIn, // input token object with token address, decimals, symbol, name
    tokenOut, // output token object with token address, decimals, symbol, name
    permitSig: any = undefined, // permit signature object
  ) => {
    if (!provider) {
        throw new Error('No provider')
    }
    const router = new AlphaRouter({
      chainId, // chainId of the network you want to use
      provider, // ethers.js provider object
    });
  
    try {
      const tokenA =
        tokenIn.token_address.toLowerCase() === getChainWiseNativeToken() // check if input token is native token of the chain
          ? nativeOnChain(chainId) // if native token, get native token object
          : new Token(
              chainId,
              tokenIn.token_address,
              +tokenIn.decimals,
              tokenIn.symbol,
              tokenIn.symbol,
            ); // if not native token, create token object
      const tokenB = new Token(
        chainId,
        tokenOut.address,
        tokenOut.decimals,
        tokenOut.symbol,
        tokenOut.name,
      ); // create token object for output token
  
      const amountIn = CurrencyAmount.fromRawAmount(
        tokenA,
        JSBI.BigInt(ethers.utils.parseUnits(amount.toString(), tokenA.decimals)),
      ); // get input token amount in CurrencyAmount object
  
      let swapOptions: SwapOptions = {
        type: SwapType.UNIVERSAL_ROUTER,
        recipient: signer.address,
        slippageTolerance: new Percent(5, 100),
        // deadlineOrPreviousBlockhash: parseDeadline(360),
      }; // swap options object
  
      if (permitSig?.signature) {
        swapOptions = {
          ...swapOptions,
          inputTokenPermit: {
            ...permitSig?.permit,
            signature: permitSig.signature,
          },
        };
      } // if permit signature is present, add permit signature to swap options
  
      const quote = await router.route(
        amountIn,
        tokenB,
        TradeType.EXACT_INPUT,
        swapOptions,
      ); // get quote from router
  
      console.log(quote, "quote");
      return quote; // return quote
    } catch (err) {
      console.log(err);
    }
  };


  const handleSwap = async (
    quote: any, // quote object from getQuote()
    token_A: Token, // input token object
    token_B: Token, // output token object
  ) => {
    const { trade, route } = quote;
    if (!token_A.symbol || !token_B.symbol) {
        throw new Error('no')
    }
  
    try {
      let methodParameters = quote.methodParameters;
  
      const universalRouter = methodParameters?.to; // universal router address
  
      if (
        token_A.address.toLowerCase() !== getChainWiseNativeToken()
      ) {
        console.log(
          `checking ${token_A.symbol.toUpperCase()} token allowance...`,
        );
        // Give approval to the router to spend the token
        const tokenApproval = await getTokenTransferApproval(
          token_A.address,
          +token_A.decimals,
          token_A.symbol,
          +trade.inputAmount.toExact(),
        );
        // Fail if transfer approvals do not go through
        if (!tokenApproval) {
          return;
        }
        let permitSignatureTemp = permitSignature; // store permitSignature in a state variable
        if (
          !permitSignatureTemp ||
          !verifySignature(permitSignatureTemp, token_A)
        ) {
          const permit = makePermit(
            token_A.address,
            MAX_UINT160.toString(),
            undefined,
            universalRouter,
          );
          const signature = await generatePermitSignature(
            permit,
            signer,
            chainId,
          );
          if (!signature) return console.log("signature generation failed");
          permitSignatureTemp = {
            signature,
            permit,
          };
        //   setPermitSignature(permitSignatureTemp);
        }
  
        const newQuote = await getQuote(
          +trade.inputAmount.toExact(),
          token_A,
          token_B,
          permitSignatureTemp,
        );
  
        if (!newQuote) return;
  
        methodParameters = newQuote.methodParameters;
        // }
      }
  
      console.log("swapping tokens...");
  
      const hexValue = methodParameters?.value;
      const bigNumberValue = ethers.BigNumber.from(hexValue);
  
      const tx = {
        to: methodParameters?.to,
        data: methodParameters?.calldata,
        ...(!bigNumberValue.isZero() ? { value: methodParameters?.value } : {}),
      };
  
      console.log(tx, "tx");
  
      let gasEstimate;
      try {
        gasEstimate = await signer.estimateGas(tx);
      } catch (err) {
        console.log(err?.message);
        gasEstimate = ethers.BigNumber.from(DEFAULT_GAS_LIMIT); // DEFAULT_GAS_LIMIT = 210000
      }
      const gasLimit = gasEstimate.mul(120).div(100);
      const response = await signer.sendTransaction({
        ...tx,
        gasLimit,
      });
      const receipt = await response.wait();
      console.log("---------------------------- SUCCESS?");
      console.log("status", receipt.status);
      return receipt;
    } catch (err) {
      console.log(err);
      return null;
    }
  };