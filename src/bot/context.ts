import { Context, Markup, Scenes } from "telegraf";
import { OrderSession } from "./orders";
import { WalletSession } from "./wallets";
import { emojs } from "../libs/constants2";

export interface BotWizardSession
  extends Scenes.WizardSessionData,
    OrderSession,
    WalletSession {}
export interface MySession extends Scenes.WizardSession<BotWizardSession> {
  mySessionProp: number;
}
export interface BotContext extends Context {
  myContextProp: string;
  session: MySession;
  scene: Scenes.SceneContextScene<BotContext, BotWizardSession>;
  wizard: Scenes.WizardContextWizard<BotContext>;
}

export const yesOrNoKeyboardNetwork = Markup.keyboard([
  [Markup.button.callback("Yes", "Yes")],
  [Markup.button.callback("No", "No")],
]);

export const cancelBtn = Markup.inlineKeyboard([
  Markup.button.callback(`${emojs.cancel} Cancel`, "leave"),
]);
