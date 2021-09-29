import { EIP712Domain } from "./eip712"

const OrderRFQ = [
    { name: "info", type: "uint256" },
    { name: "makerAsset", type: "address" },
    { name: "takerAsset", type: "address" },
    { name: "makerAssetData", type: "bytes" },
    { name: "takerAssetData", type: "bytes" },
]

const Order = [
    { name: "salt", type: "uint256" },
    { name: "makerAsset", type: "address" },
    { name: "takerAsset", type: "address" },
    { name: "makerAssetData", type: "bytes" },
    { name: "takerAssetData", type: "bytes" },
    { name: "getMakerAmount", type: "bytes" },
    { name: "getTakerAmount", type: "bytes" },
    { name: "predicate", type: "bytes" },
    { name: "permit", type: "bytes" },
    { name: "interaction", type: "bytes" },
]

export const name = "1inch Limit Order Protocol"
export const version = "2"

export function buildOrderData(chainId: number, verifyingContract: string, order) {
    return {
        primaryType: "Order",
        types: { EIP712Domain, Order },
        domain: { name, version, chainId, verifyingContract },
        message: order,
    }
}

export function buildOrderRFQData(chainId, verifyingContract, order) {
    return {
        primaryType: "OrderRFQ",
        types: { EIP712Domain, OrderRFQ },
        domain: { name, version, chainId, verifyingContract },
        message: order,
    }
}

export function cutLastArg(data, padding = 0) {
    return data.substr(0, data.length - 64 - padding)
}
