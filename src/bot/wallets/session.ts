import { Scenes } from "telegraf";

export interface WalletSession extends Scenes.WizardSessionData {
    walletAddress: string;
    walletName: string;
    idWalletToDelete: string;
    idWalletToEdit: string;
}