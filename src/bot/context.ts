import { Context, Markup, Scenes } from "telegraf";
import { OrderSession } from "./orders";
import { WalletSession } from "./wallets";
import { emojs } from "../libs/constants2";

export interface BotWizardSession
  extends Scenes.WizardSessionData,
  OrderSession,
  WalletSession { }
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

export const yesOrNoInlineKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback(`${emojs.yes} Yes`, "yes"), Markup.button.callback(`${emojs.no} No`, "no")]
])

export const confirmInlineKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback(`${emojs.yes} Confirm`, "confirm"), Markup.button.callback(`${emojs.no} Cancel`, "not_confirm")]
])

export const cancelBtn = Markup.inlineKeyboard([
  Markup.button.callback(`${emojs.cancel} Cancel`, "leave"),
]);

export const cancelBtnStep1 = Markup.inlineKeyboard([
  Markup.button.callback(`${emojs.cancel} Cancel`, "leave_step_1"),
]);

export const cancelBtnStep2 = Markup.inlineKeyboard([
  Markup.button.callback(`${emojs.cancel} Cancel`, "leave_step_2"),
]);

export const cancelBtnStep3 = Markup.inlineKeyboard([
  Markup.button.callback(`${emojs.cancel} Cancel`, "leave_step_3"),
]);

export const cancelBtnStep4 = Markup.inlineKeyboard([
  Markup.button.callback(`${emojs.cancel} Cancel`, "leave_step_4"),
]);

export const closeBtn = Markup.inlineKeyboard([
  Markup.button.callback(`${emojs.cancel} Close`, "close"),
]);
