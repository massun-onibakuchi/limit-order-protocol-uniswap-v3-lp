import { keccak256, defaultAbiCoder, toUtf8Bytes } from "ethers/lib/utils"

export const EIP712Domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
]

const EIP712_DOMAIN_TYPEHASH = keccak256(
    toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
)

export function domainSeparator(name: string, version: string, chainId: number, verifyingContract: string) {
    return keccak256(
        defaultAbiCoder.encode(
            ["bytes32", "bytes32", "bytes32", "uint256", "address"],
            [
                EIP712_DOMAIN_TYPEHASH,
                keccak256(toUtf8Bytes(name)),
                keccak256(toUtf8Bytes(version)),
                chainId,
                verifyingContract,
            ],
        ),
    )
}
