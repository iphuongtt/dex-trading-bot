import { Scenes } from "telegraf";
import { ChainId } from "@uniswap/sdk-core";
import { Token as TokenModel } from "../../models"
import { OrderType, SupportedChain } from "../../types";

export interface OrderSession extends Scenes.WizardSessionData {
    idOrderToEdit: string;
    idOrderToDelete: string;
    addChain: SupportedChain | null;
    addOrderWallet: string;
    addChainId: ChainId;
    baseTokenAddress: string;
    baseTokenData: TokenModel;
    quoteTokenAddress: string;
    quoteTokenData: TokenModel;
    baseTokenAmount: number;
    orderType: OrderType;
    targetPrice: number;
    routePath: string;
    currentPrice: string
}
