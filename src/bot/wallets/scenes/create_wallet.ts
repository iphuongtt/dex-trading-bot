import { Format } from "telegraf";
import { cancelBtn } from "../../context";
import { deleteLastMessage, encrypt, isVIP, reply } from "../../util";
import { create, getDoc, getServerTimeStamp, incrementNumericValue, isExists } from "../../../libs/firestore";
import { ethers } from "ethers-new";
import { Wallet } from "../../../models";
import { removeUndefined } from "../../../libs";
import { emojs } from "../../../libs/constants2";
import { CommonWizard } from "../../utils";

export const createWalletWizard = new CommonWizard(
  "createWalletWizard",
  async (ctx) => {
    await deleteLastMessage(ctx);
    await reply(ctx, "Please enter wallet name", cancelBtn);
    ctx.scene.session.createWalletName = "";
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const teleUser = ctx.from;
      if (!teleUser) {
        await reply(ctx, "User not found");
        return ctx.scene.leave();
      }
      const user: any = await getDoc("users", null, [
        {
          field: "telegram_id",
          operation: "==",
          value: teleUser.id,
        },
      ]);
      if (!user) {
        await reply(ctx, "User not found");
        return ctx.scene.leave();
      }
      if (!isVIP(user) && user.count_wallets > 0) {
        await reply(
          ctx,
          `${emojs.error} You can create maximum 1 wallet. Please upgrade to VIP account`
        );
        return ctx.scene.leave();
      }
      const isWalletNameExist = await isExists("wallets", null, [
        {
          field: "name",
          operation: "==",
          value: ctx.message.text,
        },
        {
          field: "telegram_id",
          operation: "==",
          value: teleUser.id,
        },
      ]);
      if (!isWalletNameExist) {
        const wallet = ethers.Wallet.createRandom();
        console.log("address:", wallet.address);
        if (wallet.mnemonic) {
          console.log("mnemonic:", wallet.mnemonic.phrase);
        }
        console.log("privateKey:", wallet.privateKey);

        const newWallet: Wallet = {
          wallet: wallet.address.toLowerCase(),
          user_id: user.id,
          create_at: getServerTimeStamp(),
          name: ctx.message.text,
          telegram_id: teleUser.id,
          private_key: encrypt(teleUser.id, wallet.privateKey),
          seed_pharse: wallet.mnemonic
            ? encrypt(teleUser.id, wallet.mnemonic.phrase)
            : "",
        };
        const result = await create(
          "wallets",
          null,
          removeUndefined(newWallet)
        );
        await incrementNumericValue("users", user.id, "count_wallets");
        if (result) {
          const strs = [
            Format.fmt`Wallet added:\n`,
            Format.fmt` ${emojs.address} ${Format.bold(
              "Address"
            )}: ${Format.code(wallet.address.toLowerCase())}\n`,
            Format.fmt` ${emojs.name} ${Format.bold("Name")}: ${Format.code(
              ctx.message.text
            )}\n`,
            Format.fmt` ${emojs.key} ${Format.bold(
              "Private key"
            )}: ${Format.spoiler(wallet.privateKey)}\n`,
            Format.fmt` ${emojs.seed} ${Format.bold(
              "Seed pharse"
            )}: ${Format.spoiler(
              wallet.mnemonic ? wallet.mnemonic.phrase : ""
            )}\n`,
          ];
          await reply(ctx, Format.join(strs));
          return ctx.scene.leave();
        } else {
          await reply(
            ctx,
            Format.fmt`Wallet: ${Format.code(ctx.message.text)} add error`
          );
          return ctx.scene.leave();
        }
      } else {
        await reply(
          ctx,
          Format.fmt`Wallet name: ${Format.code(ctx.message.text)} exists`
        );
        return ctx.scene.leave();
      }
    }
    return ctx.scene.leave();
  }
);
