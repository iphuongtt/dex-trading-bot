import { Scenes } from "telegraf";
import { OrderType, SupportedChain } from "../../libs/types";
import { ChainId, Token } from "@uniswap/sdk-core";

export interface OrderSession extends Scenes.WizardSessionData {
    idOrderToEdit: string;
    idOrderToDelete: string;
    addChain: SupportedChain | null;
    addChainId: ChainId;
    baseTokenAddress: string;
    baseTokenData: Token;
    quoteTokenAddress: string;
    quoteTokenData: Token;
    baseTokenAmount: number;
    orderType: OrderType;
    targetPrice: number
}
