import { Validator, Schema } from 'jsonschema'
import { chainSchema, tokenSchema, orderTypeSchema } from '../testSchema';

var v = new Validator();



export const addAddWalletSchema: Schema = {
    "id": "/addAddWalletSchema",
    "type": "object",
    "properties": {
        "chain": { "$ref": "/chainSchema" },
        "wallet": { "type": "string" },
    },
    "required": ["chain", "wallet"]
};

var template = {
    chain: "base (hiện tại chỉ hỗ trợ mạng chain Base)",
    wallet: "Địa chỉ ví"
};

export const isValidAddOrder = (data: Object): boolean => {
    console.log({ data })
    v.addSchema(chainSchema, '/chainSchema');
    v.addSchema(orderTypeSchema, '/orderTypeSchema');
    v.addSchema(tokenSchema, '/tokenSchema');
    const res = v.validate(data, addAddWalletSchema)
    if (!res.valid) {
        return false
    } else {
        return true
    }
}


export const getAddOrderTemplate = (): string => {
    return JSON.stringify(template, undefined, 2);
}
