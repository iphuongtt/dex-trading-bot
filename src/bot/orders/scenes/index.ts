import { add2OrderWizard } from "./add_2_order";
import { addOrderWizard } from "./add_order";
import { deleteOrderWizard } from "./delete_order";
import { editOrderAmountWizard } from "./edit_order_amount";
import { editOrderPriceWizard } from "./edit_order_price";
import { editOrderStatusWizard } from "./edit_order_status";
import { getTemplateWizard } from "./get_template";

export const orderScenes = [
  addOrderWizard,
  getTemplateWizard,
  editOrderPriceWizard,
  editOrderAmountWizard,
  editOrderStatusWizard,
  deleteOrderWizard,
  add2OrderWizard,
];
