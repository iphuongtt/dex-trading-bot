import { FieldValue } from "firebase-admin/firestore";
import { OrderType, SupportedChain } from "../types";
import { Token } from "./token";


export interface Order {
    id?: string;
    user_id: string;
    wallet_id: string;
    chain: SupportedChain
    telegram_id: number;
    type: OrderType;
    wallet: string;
    base_token: Token;
    quote_token: Token;
    amount: number;
    target_price: number;
    transaction_hash: string | null;
    is_filled: boolean;
    create_at: FieldValue;
    is_active: boolean;
}
