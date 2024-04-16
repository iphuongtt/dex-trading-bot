import { Context, Markup, Scenes } from "telegraf";

export interface MyWizardSession extends Scenes.WizardSessionData {
    walletAddress: string;
    walletName: string;
    idWalletToDelete: string;
    idWalletToEdit: string;
    idOrderToEdit: string;
    idOrderToDelete: string;
}
export interface MySession extends Scenes.WizardSession<MyWizardSession> {
    mySessionProp: number;
}
export interface MyContext extends Context {
    myContextProp: string;
    session: MySession;
    scene: Scenes.SceneContextScene<MyContext, MyWizardSession>;
    wizard: Scenes.WizardContextWizard<MyContext>;
}


export const yesOrNoKeyboardNetwork = Markup.keyboard([
    [Markup.button.callback("Yes", 'Yes')],
    [Markup.button.callback("No", 'No')],
]);
