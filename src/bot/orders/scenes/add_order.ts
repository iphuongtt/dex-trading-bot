import { Format, Scenes } from "telegraf";
import { BotContext, cancelBtn } from "../../context";
import { deleteLastMessage, isVIP, reply } from "../../util";
import { isValidAddOrder } from "../schema";
import { create, getDoc, getServerTimeStamp, incrementNumericValue } from "../../../libs/firestore";
import { emojs } from "../../../libs/constants2";
import { Order } from "../../../models";
import { removeUndefined } from "../../../libs";
import { leaveSceneOrderStep0 } from "../command";
import _ from "lodash";

export const addOrderWizard = new Scenes.WizardScene<BotContext>(
  "addOrderWizard",
  async (ctx) => {
    await deleteLastMessage(ctx);
    await reply(ctx, "Please enter the order data", cancelBtn);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      try {
        const orderData = JSON.parse(ctx.message.text);
        if (isValidAddOrder(orderData)) {
          const teleUser = ctx.from;
          if (!teleUser) {
            await reply(ctx, "User not found");
            return ctx.scene.leave();
          }
          const user: any = await getDoc("users", null, [
            { field: "telegram_id", operation: "==", value: teleUser.id },
          ]);
          if (!user) {
            await reply(ctx, "User not found");
            return ctx.scene.leave();
          }
          if (!isVIP(user) && user.count_orders > 0) {
            await reply(ctx,
              `${emojs.error} You can create maximum 1 order. Please upgrade to VIP account`
            );
            return ctx.scene.leave();
          }
          //Check if the wallet address has been configured with the corresponding private key or not.
          const walletAddress = _.get(orderData, "wallet", null).toLowerCase();
          const wallet = await getDoc("wallets", null, [
            { field: "wallet", operation: "==", value: walletAddress },
            { field: "telegram_id", operation: "==", value: teleUser.id },
          ]);
          if (!wallet) {
            await reply(ctx, "Wallet not found");
            return ctx.scene.leave();
          }
          const newOrder: Order = {
            ...orderData,
            wallet: walletAddress,
            wallet_id: wallet.id,
            user_id: user.id,
            telegram_id: teleUser.id,
            create_at: getServerTimeStamp(),
            is_filled: false,
            is_active: true,
            transaction_hash: null,
          };
          const result = await create(
            "orders",
            null,
            removeUndefined(newOrder)
          );
          if (result) {
            await incrementNumericValue("users", user.id, "count_orders");
            await reply(ctx, Format.fmt`Order added`);
          } else {
            await reply(ctx, Format.fmt`Order add error`);
          }
          return ctx.scene.leave();
        } else {
          await reply(ctx,
            Format.fmt`The data is not in the correct JSON format`
          );
          return ctx.scene.leave();
        }
      } catch (error) {
        await reply(ctx, Format.fmt`The data is not in the correct JSON format`);
        return ctx.scene.leave();
      }
    } else {
      ctx.scene.leave();
    }
  }
);

addOrderWizard.action("leave", leaveSceneOrderStep0);
