import { Validator, Schema } from "jsonschema";

var v = new Validator();

export const tokenSchema: Schema = {
  id: "/tokenSchema",
  type: "object",
  properties: {
    address: { type: "string" },
    decimals: { type: "number" },
    symbol: { type: "string" },
    name: { type: "string" },
  },
  required: ["address", "decimals", "symbol", "name"],
};

export const chainSchema: Schema = {
  id: "/chainSchema",
  type: "string",
  enum: ["base", "zora"],
};

export const orderTypeSchema: Schema = {
  id: "/orderTypeSchema",
  type: "string",
  enum: ["buy", "sell"],
};

export const addOrderSchema: Schema = {
  id: "/addOrderSchema",
  type: "object",
  properties: {
    chain: { $ref: "/chainSchema" },
    type: { $ref: "/orderTypeSchema" },
    wallet: { type: "string" },
    token_in: { $ref: "/tokenSchema" },
    token_out: { $ref: "/tokenSchema" },
    amount_in: { type: "number" },
    target_price: { type: "number" },
  },
  required: [
    "chain",
    "type",
    "wallet",
    "token_in",
    "token_out",
    "amount_in",
    "target_price",
  ],
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
  target_price: 0.00000000000099,
};

export const isValidAddOrder = (data: Object): boolean => {
  console.log({ data });
  v.addSchema(chainSchema, "/chainSchema");
  v.addSchema(orderTypeSchema, "/orderTypeSchema");
  v.addSchema(tokenSchema, "/tokenSchema");
  const res = v.validate(data, addOrderSchema);
  if (!res.valid) {
    return false;
  } else {
    return true;
  }
};

export const getAddOrderTemplate = (): string => {
  return JSON.stringify(template, undefined, 2);
};
