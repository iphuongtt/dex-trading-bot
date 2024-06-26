import { FieldValue } from "firebase-admin/firestore";

export interface WalletWhiteList {
    id?: string;
    user_id: string;
    telegram_id: number;
    wallet: string;
    name: string;
    create_at: FieldValue;
}
