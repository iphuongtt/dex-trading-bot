import { Scenes } from "telegraf";
import { SupportedChain } from "../../types";
import { Token as TokenModel } from "../../models"
import { ChainId } from "@uniswap/sdk-core";

export interface WalletSession extends Scenes.WizardSessionData {
    walletAddress: string;
    walletName: string;
    idWalletToDelete: string;
    idWalletToEdit: string;
    createWalletName: string;
    transferChain: SupportedChain | null;
    transferTokenAddr: string;
    transferTokenData: TokenModel;
    transferChainId: ChainId;
    transferReceiveAddress: string;
    transferWallet: string;
    transferWalletId: string;
    transferDone: boolean;
    transferAmount: number;
    tokenBalance: number
}
