const { networkConfig, CONTRACTS } = require('../utils/helper-hardhat-config');

const func = async ({
    getNamedAccounts,
    deployments,
    getChainId
}) => {
    const devWalletDeployment = await deployments.get(CONTRACTS.devWallet);
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = await getChainId()

    const { contractName, contractSymbol, initBaseURI, _validatorAddress, devMultisigAddress } = networkConfig[chainId];

    log("====================== NFT ==========================");
    log("=====================================================");
    
    const NFT = await deploy(CONTRACTS.nft, {
        from: deployer,
        log: true,
        args: [
            contractName,
            contractSymbol,
            initBaseURI,
            _validatorAddress,
            devWalletDeployment.address,
            devMultisigAddress,
        ],
    })
    log(`You have deployed an NFT contract to "${NFT.address}"`);
    log("=====================================================");
    log("=====================================================");
    const networkName = networkConfig[chainId]['name'];

    await run("verify:verify", {
        address: NFT.address,
        constructorArguments: [
            contractName,
            contractSymbol,
            initBaseURI,
            _validatorAddress,
            devWalletDeployment.address,
            devMultisigAddress,
        ]
    });

    console.log('***********************************');
    console.log('***********************************');
    console.log('\n');
    console.log('[Contract] AlphieWhale NFT has been verify!');
    console.log('\n');
    console.log('***********************************');
    console.log('***********************************');
}

func.tags = ['nft'];
func.dependencies = [
    CONTRACTS.devWallet,
];


module.exports = func;