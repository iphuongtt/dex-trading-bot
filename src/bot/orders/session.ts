import { Scenes } from "telegraf";

export interface OrderSession extends Scenes.WizardSessionData {
    idOrderToEdit: string;
    idOrderToDelete: string;
}