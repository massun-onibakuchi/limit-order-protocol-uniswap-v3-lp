import { deployments, ethers, getNamedAccounts } from "hardhat"
import { expect, use } from "chai"
import { Contract } from "ethers"
import { LimitOrderProtocol, InteractiveNotificationReceiverMock, ERC20Mock, WETH } from "../typechain"
import { buildOrder } from "./helpers/order"
import { buildOrderData } from "./helpers/utils"

/// @note This test is a modified version of https://github.com/1inch/limit-order-protocol/blob/d72d31dcd60c667545f08692bd4f5c82dffdc314/test/LimitOrderProtocol.js
///         - web3.js => ethers
///         - test interaction
use(require("chai-bignumber")())
const toWei = ethers.utils.parseEther
const zeroAddress = ethers.constants.AddressZero

describe("LimitOrderProtocol", async function () {
    let chainId
    let signer
    let taker

    let dai: ERC20Mock
    let weth: WETH
    let swap: LimitOrderProtocol
    let notificationReceiver: InteractiveNotificationReceiverMock
    const deployedContracts: { [name: string]: Contract } = {}
    before(async function () {
        ;({ chainId } = await ethers.provider.getNetwork())
        const { wallet, taker: takerAddr } = await getNamedAccounts()
        signer = await ethers.getSigner(wallet) // maker
        taker = await ethers.getSigner(takerAddr)
    })
    beforeEach(async function () {
        const { owner } = await getNamedAccounts()
        const deployer = await ethers.getSigner(owner)
        const results = await deployments.fixture(["MockToken", "LimitOrderProtocol"])
        for (const [name, result] of Object.entries(results)) {
            deployedContracts[name] = await ethers.getContractAt(name, result.address, deployer)
        }
        ;({
            LimitOrderProtocol: swap,
            ERC20Mock: dai,
            WETH: weth,
            InteractiveNotificationReceiverMock: notificationReceiver,
        } = deployedContracts as any)

        await dai.mint(signer.address, toWei("1"))
        await dai.mint(taker.address, toWei("1"))
        await weth.connect(signer).deposit({ value: toWei("1") })
        await weth.connect(taker).deposit({ value: toWei("1") })

        await dai.connect(signer).approve(swap.address, toWei("1"))
        await weth.connect(signer).approve(swap.address, toWei("1"))
        await dai.connect(taker).approve(swap.address, toWei("1"))
        await weth.connect(taker).approve(swap.address, toWei("1"))
    })

    it("Interaction - should fill and unwrap token", async function () {
        // signer who is a maker would sell his DAI to buy WETH

        const interaction = notificationReceiver.address + signer.address.substr(2)

        const order = buildOrder(
            swap,
            dai, // Asset which maker want to sell
            weth, // Asset which maker want to buy
            1, // makerAsset Amount
            1, // takerAsset Amount
            signer.address, // maker
            zeroAddress,
            swap.interface.encodeFunctionData("timestampBelow", [0xff00000000]),
            "0x",
            interaction,
            notificationReceiver.address, // CustomReceiver
        )
        const data = buildOrderData(chainId, swap.address, order)
        const signature = await signer._signTypedData(data.domain, { Order: data.types.Order }, data.message)

        const signerDai = await dai.balanceOf(signer.address)
        const takerDai = await dai.balanceOf(taker.address)
        const signerWeth = await weth.balanceOf(signer.address)
        const takerWeth = await weth.balanceOf(taker.address)
        const signerEth = await ethers.provider.getBalance(signer.address)

        // unwrap WETH which maker would buy and send
        await swap
            .connect(taker)
            .fillOrder(order, signature, 1 /* makingAmount */, 0 /* takingAmount */, 1 /* thresholdAmount */)

        expect(await ethers.provider.getBalance(signer.address)).to.equal(signerEth.add(1))
        expect(await dai.balanceOf(signer.address)).to.equal(signerDai.sub(1))
        expect(await dai.balanceOf(taker.address)).to.equal(takerDai.add(1))
        expect(await weth.balanceOf(signer.address)).to.equal(signerWeth)
        expect(await weth.balanceOf(taker.address)).to.equal(takerWeth.sub(1))
    })
})
