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

var p = {
    chain: "zora",
    type: "sell",
    wallet: "My wallet",
    token_in: {
        address: "token_in",
        decimals: 18,
        symbol: "symbol",
        name: "name",
    },
    token_out: {
        address: "token_out",
        decimals: 18,
        symbol: "symbol",
        name: "name",
    },
    amount_in: 124,
    target_price: 0.00000000000099
};

export const isValid = (data: Object): boolean => {
    v.addSchema(chainSchema, '/chainSchema');
    v.addSchema(tradeTypeSchema, '/tradeTypeSchema');
    v.addSchema(tokenSchema, '/tokenSchema');
    const res = v.validate(p, addTradeSchema)
    if (!res.valid) {
        throw new Error('data invalid')
    } else {
        return true
    }
}