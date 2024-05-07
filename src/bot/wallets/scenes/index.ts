import { addWhiteListWalletWizard } from "./add_whitelist_wallet";
import { createWalletWizard } from "./create_wallet";
import { deleteCurrentWalletWizard } from "./delete_current_wallet";
import { deleteWLWalletWizard } from "./delete_wl_wallet";
import { editCurrentWalletWizard } from "./edit_current_wallet";
import { editWalletWizard } from "./edit_wallet";
import { editWLWalletWizard } from "./edit_wl_wallet";
import { transferWizard } from "./transfer";

export const walletScenes = [
  deleteWLWalletWizard,
  editWalletWizard,
  createWalletWizard,
  editCurrentWalletWizard,
  deleteCurrentWalletWizard,
  transferWizard,
  addWhiteListWalletWizard,
  editWLWalletWizard,
  deleteWLWalletWizard,
];
