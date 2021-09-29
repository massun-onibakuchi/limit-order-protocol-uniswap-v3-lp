import hre, { waffle, ethers, deployments, getNamedAccounts } from "hardhat"
import { DeployFunction, DeployResult } from "hardhat-deploy/dist/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const limitOrderProtocolDeployment: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts } = hre
    const { deploy } = deployments
    const { owner } = await getNamedAccounts()

    const options = { from: owner }
    await deploy("LimitOrderProtocol", options)
    await deploy("InteractiveNotificationReceiverMock", options)
    await deploy("AggregatorMock", { ...options, args: [10] })
}
export default limitOrderProtocolDeployment
limitOrderProtocolDeployment.tags = ["LimitOrderProtocol"]
