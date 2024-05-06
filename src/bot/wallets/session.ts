import { Scenes } from "telegraf";
import { SupportedChain } from "../../types";
import { Token as TokenModel, Wallet, WalletWhiteList } from "../../models"
import { ChainId } from "@uniswap/sdk-core";
import { Message } from "telegraf/typings/core/types/typegram";

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
    tokenBalance: number;
    walletWLAddr: string;
    walletWLName: string;
    idWLWalletToDelete: string;
    idWLWalletToEdit: string;
    lastMsgFromBot: Message.TextMessage;
    wallets: Wallet[];
    walletsWL: WalletWhiteList[];
}
