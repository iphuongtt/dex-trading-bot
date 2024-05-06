import _ from "lodash";
import { transferWizard } from "./scenes/transfer";
import { editWLWalletWizard } from "./scenes/edit_wl_wallet";
import { addWhiteListWalletWizard } from "./scenes/add_whitelist_wallet";
import { editWalletWizard } from "./scenes/edit_wallet";
import { createWalletWizard } from "./scenes/create_wallet";
import { deleteWLWalletWizard } from "./scenes/delete_wl_wallet";
import { editCurrentWalletWizard } from "./scenes/edit_current_wallet";
import { deleteCurrentWalletWizard } from "./scenes/delete_current_wallet";

//=============================

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

//Private method
