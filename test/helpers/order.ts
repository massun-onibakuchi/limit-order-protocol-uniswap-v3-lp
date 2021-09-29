import { ethers } from "hardhat"
import { BigNumberish } from "ethers"
import { LimitOrderProtocol, IERC20 } from "../../typechain"
import { cutLastArg } from "./utils"
const zeroAddress = ethers.constants.AddressZero

export function buildOrder(
    exchange: LimitOrderProtocol,
    makerAsset: IERC20,
    takerAsset: IERC20,
    makerAmount: BigNumberish,
    takerAmount: BigNumberish,
    maker: string,
    taker = zeroAddress,
    predicate = "0x",
    permit = "0x",
    interaction = "0x",
    customReciever?: string,
) {
    return buildOrderWithSalt(
        exchange,
        "1",
        makerAsset,
        takerAsset,
        makerAmount,
        takerAmount,
        maker,
        taker,
        predicate,
        permit,
        interaction,
        customReciever,
    )
}

function buildOrderWithSalt(
    exchange: LimitOrderProtocol,
    salt: string,
    makerAsset: IERC20,
    takerAsset: IERC20,
    makerAmount: BigNumberish,
    takerAmount: BigNumberish,
    maker: string,
    taker = zeroAddress,
    predicate = "0x",
    permit = "0x",
    interaction = "0x",
    customReciever = maker,
) {
    return {
        salt: salt,
        makerAsset: makerAsset.address,
        takerAsset: takerAsset.address,
        makerAssetData: makerAsset.interface.encodeFunctionData("transferFrom", [maker, taker, makerAmount]),
        takerAssetData: takerAsset.interface.encodeFunctionData("transferFrom", [taker, customReciever, takerAmount]),
        getMakerAmount: cutLastArg(
            exchange.interface.encodeFunctionData("getMakerAmount", [makerAmount, takerAmount, 0]),
        ),
        getTakerAmount: cutLastArg(
            exchange.interface.encodeFunctionData("getTakerAmount", [makerAmount, takerAmount, 0]),
        ),
        predicate: predicate,
        permit: permit,
        interaction: interaction,
    }
}
