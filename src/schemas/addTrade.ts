import { Validator, Schema } from 'jsonschema'
import { chainSchema, tokenSchema, tradeTypeSchema } from '../testSchema';

var v = new Validator();



export const addTradeSchema: Schema = {
    "id": "/addTradeSchema",
    "type": "object",
    "properties": {
        "chain": { "$ref": "/chainSchema" },
        "type": { "$ref": "/tradeTypeSchema" },
        "wallet": { "type": "string" },
        "token_in": { "$ref": "/tokenSchema" },
        "token_out": { "$ref": "/tokenSchema" },
        "amount_in": { "type": "number" },
        "target_price": { "type": "number" }
    },
    "required": ["chain", "type", "wallet", "token_in", "token_out", "amount_in", "target_price"]
};

var template = {
    chain: "base (only support Base chain)",
    type: "sell | buy",
    wallet: "Wallet address",
    token_in: {
        address: "Token address",
        decimals: 18,
        symbol: "Token symbol",
        name: "Token name",
    },
    token_out: {
        address: "Token address",
        decimals: 18,
        symbol: "Token symbol",
        name: "Token name",
    },
    amount_in: 124,
    target_price: 0.00000000000099
};

export const isValidAddTrade = (data: Object): boolean => {
    console.log({ data })
    v.addSchema(chainSchema, '/chainSchema');
    v.addSchema(tradeTypeSchema, '/tradeTypeSchema');
    v.addSchema(tokenSchema, '/tokenSchema');
    const res = v.validate(data, addTradeSchema)
    if (!res.valid) {
        return false
    } else {
        return true
    }
}


export const getAddTradeTemplate = (): string => {
    return JSON.stringify(template, undefined, 2);
}