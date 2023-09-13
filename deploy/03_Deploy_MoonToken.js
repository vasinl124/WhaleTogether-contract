const { networkConfig, CONTRACTS } = require('../utils/helper-hardhat-config');

const func = async ({
    getNamedAccounts,
    deployments,
    getChainId
}) => {
    const nftDeployment = await deployments.get(CONTRACTS.nft);
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts();
    const chainId = await getChainId();

    const { daoMultisigAddress } = networkConfig[chainId];

    log("----------------------------------------------------");
    log("----------------------------------------------------");

    const MoonToken = await deploy(CONTRACTS.moonToken, {
        from: deployer,
        log: true,
        args: [
            nftDeployment.address,
            daoMultisigAddress,
        ],
    })
    log(`You have deployed an MoonToken contract to "${MoonToken.address}""`)
    
    await run("verify:verify", {
        address: MoonToken.address,
        constructorArguments: [
            nftDeployment.address,
            daoMultisigAddress,
        ]
    });

    console.log('***********************************');
    console.log('***********************************');
    console.log('\n');
    console.log('[Contract] MoonToken has been verify!');
    console.log('\n');
    console.log('***********************************');
    console.log('***********************************');
    log("----------------------------------------------------");
    log("----------------------------------------------------");
}

func.tags = ['token'];
func.dependencies = [
    CONTRACTS.nft,
];

module.exports = func;