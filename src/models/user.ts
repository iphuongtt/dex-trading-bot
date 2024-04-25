import { FieldValue } from "firebase-admin/firestore";

export interface User {
    id?: string;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    language_code?: string;
    username?: string;
    telegram_id: number;
    is_premium?: boolean;
    create_at: FieldValue;
    is_admin: boolean;
    is_vip: boolean;
    count_wallets: number;
    count_orders: number
}
