import { Schema } from "jsonschema";

export const chainSchema: Schema = {
    "id": "/chainSchema",
    "type": "string",
    "enum": ["base", "zora"]
};

export const orderTypeSchema: Schema = {
    "id": "/orderTypeSchema",
    "type": "string",
    "enum": ["buy", "sell"]
};

export const tokenSchema: Schema = {
    "id": "/tokenSchema",
    "type": "object",
    "properties": {
        "address": { "type": "string" },
        "decimals": { "type": "number" },
        "symbol": { "type": "string" },
        "name": { "type": "string" },
    },
    "required": ["address", "decimals", "symbol", "name"]
}
