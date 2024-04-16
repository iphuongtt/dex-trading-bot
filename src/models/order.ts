import { FieldValue } from "firebase-admin/firestore";

export interface Token {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
}

export interface Order {
    id?: string;
    user_id: string;
    chain: 'base' | 'zora'
    telegram_id: number;
    type: 'buy' | 'sell';
    wallet: string;
    token_in: Token;
    token_out: Token;
    amount_in: number;
    target_price: number;
    transaction_hash?: string;
    is_filled?: boolean;
    create_at: FieldValue;
    is_active: boolean;
}
