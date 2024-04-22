import { FieldValue } from "firebase-admin/firestore";
import { OrderType, SupportedChain } from "../../libs/types";

export interface Token {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
    isNative: boolean
}

export interface Order {
    id?: string;
    user_id: string;
    chain: SupportedChain
    telegram_id: number;
    type: OrderType;
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
