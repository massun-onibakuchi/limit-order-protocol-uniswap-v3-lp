import { ethers, getNamedAccounts } from "hardhat"
import { expect, use } from "chai"
import {
    ERC20Mock,
    LimitOrderProtocol,
    NonfungiblePositionManager,
    UniswapV3Pool,
    UniV3RangeOrder,
    WETH,
} from "../typechain"
import { setupUniV3RangeOrderTest } from "./uniswapFixture"
import { buildOrder } from "./helpers/order"
import { buildOrderData } from "./helpers/utils"
import { getMaxTick, getMinTick } from "./helpers/uniswapV3"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers"
use(require("chai-bignumber")())

const toWei = ethers.utils.parseEther

describe("UniswapV3RangeOrder", async function () {
    let chainId
    let signer: SignerWithAddress
    let taker: SignerWithAddress
    let owner: SignerWithAddress
    let dai: ERC20Mock
    let weth: WETH
    let notifReceiver: UniV3RangeOrder
    let swap: LimitOrderProtocol
    let positionManager: NonfungiblePositionManager
    let pool: UniswapV3Pool
    before(async function () {
        const { owner: ownerAddr, wallet, taker: takerAddr } = await getNamedAccounts()
        ;({ chainId } = await ethers.provider.getNetwork())
        signer = await ethers.getSigner(wallet) // maker
        taker = await ethers.getSigner(takerAddr)
        owner = await ethers.getSigner(ownerAddr)
    })
    beforeEach(async function () {
        ;({
            ERC20Mock: dai,
            WETH: weth,
            UniV3RangeOrder: notifReceiver,
            LimitOrderProtocol: swap,
            NonfungiblePositionManager: positionManager,
            UniswapV3Pool: pool,
        } = (await setupUniV3RangeOrderTest()) as any)

        await weth.connect(taker).deposit({ value: toWei("1") })
        await dai.mint(taker.address, toWei("1"))
        await weth.connect(signer).deposit({ value: toWei("1") })
        await dai.mint(signer.address, toWei("1"))
        await dai.mint(owner.address, toWei("1"))

        // const [token0, token1] =
        //     (await pool.token0()).toLowerCase() == dai.address.toLowerCase()
        //         ? [dai.address, weth.address]
        //         : [weth.address, dai.address]
        // await dai.connect(owner).approve(positionManager.address, ethers.constants.MaxUint256)
        // await weth.connect(owner).approve(positionManager.address, ethers.constants.MaxUint256)
        // await positionManager.connect(owner).mint(
        //     {
        //         token0: token0,
        //         token1: token1,
        //         fee: 3000,
        //         tickLower: getMinTick(60),
        //         tickUpper: getMaxTick(60),
        //         amount0Desired: token0 == dai.address ? 15 : 15,
        //         amount1Desired: token0 == dai.address ? 15 : 15,
        //         amount0Min: 0,
        //         amount1Min: 0,
        //         recipient: owner.address,
        //         deadline: Math.floor(Date.now() / 1000) + 300,
        //     },
        //     { value: toWei("1") },
        // )
    })
    it("Set up", async function () {
        const inverse = dai.address.toLowerCase() < weth.address.toLowerCase()
        expect(await pool.token0()).to.eq(inverse ? dai.address : weth.address)
        expect(await pool.token1()).to.eq(inverse ? weth.address : dai.address)
        expect(await pool.fee()).to.eq(3000)
        expect(await pool.tickSpacing()).to.eq(60)

        expect(await notifReceiver.WETH9()).to.eq(weth.address)
        expect(await notifReceiver.limitOrderProtocol()).to.eq(swap.address)
        expect(await notifReceiver.nonfungiblePositionManager()).to.eq(positionManager.address)
    })
    it("Deposit tokens which maker bought to UniswapV3", async function () {
        // signer who is a maker would buy WETH and submit a range order to UniswapV3
        const amtToSell = toWei("1")
        const amtToDeposit = toWei("1")
        const inverse = dai.address.toLowerCase() < weth.address.toLowerCase()
        // if inverse is true, below current price, else above current price, where price is token1 amount per token0
        const tickLower = inverse ? -46080 : 0
        const tickUpper = inverse ? 0 : 22980
        const interaction =
            notifReceiver.address +
            ethers.utils.defaultAbiCoder
                .encode(
                    ["tuple(uint24 fee, int24 tickLower, int24 tickUpper, address recipient) UniV3MintParams"],
                    [
                        {
                            fee: 3000,
                            tickLower: tickLower,
                            tickUpper: tickUpper,
                            recipient: signer.address,
                        },
                    ],
                )
                .substr(2)

        await dai.connect(signer).approve(swap.address, ethers.constants.MaxUint256)
        await weth.connect(taker).approve(swap.address, ethers.constants.MaxUint256)

        const order = buildOrder(
            swap,
            dai, // maker asset which maker want to sell
            weth, // taker asset which maker want to buy
            amtToSell, // makerAsset Amount
            amtToDeposit, // takerAsset Amount
            signer.address, // maker
            ethers.constants.AddressZero,
            swap.interface.encodeFunctionData("timestampBelow", [0xff00000000]),
            "0x",
            interaction,
            notifReceiver.address, // CustomReceiver
        )
        const data = buildOrderData(chainId, swap.address, order)
        const signature = await signer._signTypedData(data.domain, { Order: data.types.Order }, data.message)

        const signerDai = await dai.balanceOf(signer.address)
        const takerDai = await dai.balanceOf(taker.address)
        const signerWeth = await weth.balanceOf(signer.address)
        const takerWeth = await weth.balanceOf(taker.address)

        await swap
            .connect(taker)
            .fillOrder(
                order,
                signature,
                amtToSell /* makingAmount */,
                0 /* takingAmount */,
                amtToDeposit /* thresholdAmount */,
            )

        expect(await dai.balanceOf(taker.address)).to.eq(takerDai.add(amtToSell))
        expect(await dai.balanceOf(signer.address)).to.eq(signerDai.sub(amtToSell))
        expect(await weth.balanceOf(taker.address)).to.eq(takerWeth.sub(amtToDeposit))
        expect(await weth.balanceOf(signer.address)).to.eq(signerWeth)
        expect(await positionManager.balanceOf(signer.address)).to.eq(1)
    })
})
