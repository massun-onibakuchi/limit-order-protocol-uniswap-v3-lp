import { deployments } from "hardhat"
import { encodePriceSqrt } from "./helpers/uniswapV3"

export const setupUniV3RangeOrderTest = deployments.createFixture(
    async ({ deployments, getNamedAccounts, ethers }, options) => {
        // ensure you start from a fresh deployments
        await deployments.fixture(["MockToken", "LimitOrderProtocol"])

        const { owner: ownerAddr, wallet } = await getNamedAccounts()
        const owner = await ethers.getSigner(ownerAddr)

        const deployedContracts: { [name: string]: any } = {}
        const results = await deployments.all()

        const contracts = await Promise.all(
            Object.keys(results).map(name => {
                return ethers.getContractAt(name, results[name].address, owner)
            }),
        )
        Object.keys(results).forEach((name, i) => (deployedContracts[name] = contracts[i]))

        const weth = deployedContracts["WETH"]
        const dai = deployedContracts["ERC20Mock"]

        /*--------- Uniswap -----------*/
        const factoryFactory = await ethers.getContractFactory("UniswapV3Factory", owner)
        const factory = await factoryFactory.deploy()

        const nftDescriptorLibraryFactory = await ethers.getContractFactory("NFTDescriptor", owner)
        const nftDescriptorLibrary = await nftDescriptorLibraryFactory.deploy()

        const positionDescriptorFactory = await ethers.getContractFactory("NonfungibleTokenPositionDescriptor", {
            libraries: {
                NFTDescriptor: nftDescriptorLibrary.address,
            },
        })
        const nftDescriptor = await positionDescriptorFactory.deploy(weth.address)
        const positionManagerFactory = await ethers.getContractFactory("NonfungiblePositionManager")
        const nft = await positionManagerFactory.deploy(factory.address, weth.address, nftDescriptor.address)

        const tokens = dai.address.toLowerCase() < weth.address.toLowerCase() ? [dai, weth] : [weth, dai]
        nft.createAndInitializePoolIfNecessary(tokens[0].address, tokens[1].address, 3000, encodePriceSqrt(1, 1))

        const poolFactory = await ethers.getContractFactory("UniswapV3Pool")
        const poolAddress = await factory.getPool(weth.address, dai.address, 3000)
        const pool = poolFactory.attach(poolAddress)

        deployedContracts["UniswapV3Factory"] = factory
        deployedContracts["UniswapV3Pool"] = pool
        deployedContracts["NonfungiblePositionManager"] = nft

        /* ------------UniV3RangeOrder----------- */
        const notifReceiver = await deployments.deploy("UniV3RangeOrder", {
            from: owner.address,
            args: [nft.address, deployedContracts["LimitOrderProtocol"].address, weth.address],
        })

        deployedContracts["UniV3RangeOrder"] = new ethers.Contract(
            notifReceiver.address,
            notifReceiver.abi,
            await ethers.getSigner(wallet),
        )

        // Object.entries(deployedContracts).forEach(([name, contract]) => console.log(`${name} :>> `, contract.address))
        return deployedContracts
    },
)
