import { FieldValue } from "firebase-admin/firestore";

export interface Wallet {
    id?: string;
    user_id: string;
    telegram_id: number;
    wallet: string;
    create_at: FieldValue;
}
