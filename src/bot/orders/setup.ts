import { Telegraf } from "telegraf";
import { BotContext } from "../context";
import {
  editOrder,
  getOrderMenus,
  getTemplateAddOrder,
  listOrders,
} from "./command";
import _ from "lodash";

export const setupOrder = (bot: Telegraf<BotContext>) => {
  bot.command("addorder", (ctx) => ctx.scene.enter("addOrder"));

  //Bot commands
  bot.command("myorders", async (ctx) => listOrders(ctx, false));

  //Bot listeners
  bot.hears("🦄 Orders", getOrderMenus);
  //Bot Actions
  bot.action("add_order", async (ctx) => ctx.scene.enter("addOrderWizard"));
  bot.action("add_2_order", async (ctx) => ctx.scene.enter("add2OrderWizard"))
  bot.action("edit_order", editOrder);
  bot.action("delete_order", async (ctx) =>
    ctx.scene.enter("deleteOrderWizard")
  );
  bot.action("get_my_orders", async (ctx) => listOrders(ctx, false));
  bot.action("refresh_my_orders", async (ctx) => listOrders(ctx, true));
  // bot.action("get_template", getTemplate);

  bot.action("get_template", async (ctx) =>
    ctx.scene.enter("getTemplateWizard")
  );


  bot.action("get_template_add_order", getTemplateAddOrder);
  bot.action("show_order_menu", getOrderMenus);
  bot.action("back_to_order_menu", getOrderMenus);
  bot.action("change_target_price", async (ctx) =>
    ctx.scene.enter("editOrderPriceWizard")
  );
  bot.action("change_order_amount", async (ctx) =>
    ctx.scene.enter("editOrderAmountWizard")
  );
  bot.action("change_order_status", async (ctx) =>
    ctx.scene.enter("editOrderStatusWizard")
  );

  bot.command(/edit_ord_[a-zA-Z0-9]+/, async (ctx) => {
    const _math = ctx.match[0];
    const _orderId = _.replace(_math, "edit_ord_", "");
    return ctx.scene.enter("editCurrentOrderWizard", {idOrderToEdit: _orderId})
  });
  bot.command(/delete_ord_[a-zA-Z0-9]+/, async (ctx) => {
    const _math = ctx.match[0];
    const _orderId = _.replace(_math, "delete_ord_", "");
    return ctx.scene.enter("deleteOrderWizard", {idOrderToDelete: _orderId})
  });

  bot.command(/edit_target_price_ord_[a-zA-Z0-9]+/, async (ctx) => {
    const _math = ctx.match[0];
    const _orderId = _.replace(_math, "edit_target_price_ord_", "");
    return ctx.scene.enter("editOrderPriceWizard", {idOrderToEdit: _orderId})
  });

  bot.command(/edit_status_ord_[a-zA-Z0-9]+/, async (ctx) => {
    const _math = ctx.match[0];
    const _orderId = _.replace(_math, "edit_status_ord_", "");
    return ctx.scene.enter("editOrderStatusWizard", {idOrderToEdit: _orderId})
  });

  bot.command(/edit_amount_ord_[a-zA-Z0-9]+/, async (ctx) => {
    const _math = ctx.match[0];
    const _orderId = _.replace(_math, "edit_amount_ord_", "");
    return ctx.scene.enter("editOrderAmountWizard", {idOrderToEdit: _orderId})
  });
};
