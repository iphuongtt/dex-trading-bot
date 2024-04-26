import { ChainId } from "@uniswap/sdk-core";
import { SupportedChain } from "../types";

export class Token {
  id?: string;
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  logo?: string;
  chain: SupportedChain;
  chain_id: ChainId;

  constructor(
    address: string,
    decimals: number,
    symbol: string,
    name: string,
    chain: SupportedChain,
    chain_id: ChainId,
    logo?: string,
    id?: string
  ) {
    this.address = address
    this.decimals = decimals
    this.symbol = symbol
    this.name = name
    this.chain = chain
    this.chain_id = chain_id
    if (logo) {
      this.logo = logo
    }
    if (id) {
      this.id = id
    }
  }
}
