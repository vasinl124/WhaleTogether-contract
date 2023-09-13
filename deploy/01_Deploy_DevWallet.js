const { networkConfig, CONTRACTS } = require('../utils/helper-hardhat-config');

module.exports = async ({
    getNamedAccounts,
    deployments,
    getChainId,
    run,
}) => {

    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts();
    const chainId = await getChainId();

    const { wethAddress, founders, devMultisigAddress } = networkConfig[chainId];

    log("----------------------------------------------------");
    log("----------------------------------------------------");
    const DevWallet = await deploy(CONTRACTS.devWallet, {
        from: deployer,
        log: true,
        args: [
            wethAddress,
            founders,
            devMultisigAddress,
        ],
    })
    log(`You have deployed an DevWallet contract to "${DevWallet.address}""`)
    const networkName = networkConfig[chainId].name;

    await run("verify:verify", {
        address: DevWallet.address,
        constructorArguments: [
            wethAddress,
            founders,
            devMultisigAddress,
        ]
    });

    console.log('***********************************');
    console.log('***********************************');
    console.log('\n');
    console.log('[Contract] Dev Wallet has been verify!');
    console.log('\n');
    console.log('***********************************');
    console.log('***********************************');

    log("----------------------------------------------------");
    log("----------------------------------------------------");

}

module.exports.tags = ['all', 'svg']