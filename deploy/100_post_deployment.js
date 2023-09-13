const { networkConfig, CONTRACTS } = require('../utils/helper-hardhat-config');
const { waitFor } = require('../utils/txHelper');

// TODO: Shouldn't run setup methods if the contracts weren't redeployed.
const func = async (hre) => {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();
    const signer = await ethers.provider.getSigner(deployer);

    const nftDeployment = await deployments.get(CONTRACTS.nft);
    const moonTokenDeployment = await deployments.get(CONTRACTS.moonToken);

    const nftContract = await ethers.getContractFactory(CONTRACTS.nft)
    const nft = new ethers.Contract(nftDeployment.address, nftContract.interface, signer)
    await waitFor(nft.setMoonToken(moonTokenDeployment.address));

    console.log("Setup -- nftDeployment.setMoonToken: set moonToken Address on NFT Contract");
};

func.tags = ["setup"];
func.dependencies = [CONTRACTS.nft, CONTRACTS.moonToken];

module.exports = func;
