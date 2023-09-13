const networkConfig = {
    default: {
        name: 'hardhat',
        fee: '100000000000000000',
        keyHash: '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4',
        jobId: '29fa9aa13bf1468788b7cc4a500a45b8',
        fundAmount: "1000000000000000000",
        // wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },
    1: {
        name: 'main',
        wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        devMultisigAddress: '0xc11B4c75FF4a518A496c9D58d4bdD5116F8D4458',
        daoMultisigAddress: '0xeBB2a69df2A429e60A5A5C03Ac81f72a6efb6028',
        founders: [
            '0x338B71a50326606Eab38cF3D09f8E8879a6b5c36', // Max  15%
            '0x116f0780293d19d97CfF6f9950194c947f58BC14', // Greg 15%
            '0x0580AE3c5705B92AA8ade0Bc74b10B8bdB9e6218', // Nart 15%
            '0xEe9BB1acBc8eD5dBaD99C90A8560aFc174FcF7f5', // Pann 5%
            '0xc11B4c75FF4a518A496c9D58d4bdD5116F8D4458', // DevMultiSig 20%
            '0xeBB2a69df2A429e60A5A5C03Ac81f72a6efb6028', // DaoMultiSig 30%
        ],
        contractName: 'AlphieWhales',
        contractSymbol: 'ALPHIE',
        initBaseURI: 'https://alphiewhales.herokuapp.com/tokens/',
        _validatorAddress: '0x7303Bd4da70A2Dbd6D5E99E1Ea86ca6B21e5BC4E',
    },
    4: {
        name: 'rinkeby',
        wethAddress: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
        devMultisigAddress: '0x8D4bAe1E6DD1239a4ba6dD68eeC76E178e469AcD',
        daoMultisigAddress: '0x5088186743E15a9D9E3D16B3fd9B571ed98c9645',
        founders: [
            '0x338B71a50326606Eab38cF3D09f8E8879a6b5c36', // Max  15%
            '0xFc7bB8652e5580A11d8108A64508BaE717dCcBFe', // Greg 15%
            '0x6daea59468A6662D6cf6c2A51BA8FA0c7fc75B5D', // Nart 15%
            '0xC54855c09F2E8b3430F81fc7b664ca6CE9ceC67D', // Pann 5%
            '0x8D4bAe1E6DD1239a4ba6dD68eeC76E178e469AcD', // DevMultiSig 20%
            '0x5088186743E15a9D9E3D16B3fd9B571ed98c9645', // DaoMultiSig 30%
        ],
        contractName: 'AlphieWhales',
        contractSymbol: 'ALPHIE',
        initBaseURI: 'https://staging-alphiewhales.herokuapp.com/tokens/',
        _validatorAddress: '0x7303Bd4da70A2Dbd6D5E99E1Ea86ca6B21e5BC4E',
    },
}

const CONTRACTS = {
    devWallet: "DevWallet",
    nft: "AlphieWhales",
    moonToken: "MoonToken",
};

const developmentChains = ["hardhat", "localhost"]

const getNetworkIdFromName = async (networkIdName) => {
    for (const id in networkConfig) {
        if (networkConfig[id]['name'] == networkIdName) {
            return id
        }
    }
    return null
}

const autoFundCheck = async (contractAddr, networkName, linkTokenAddress, additionalMessage) => {
    const chainId = await getChainId()
    console.log("Checking to see if contract can be auto-funded with LINK:")
    const amount = networkConfig[chainId]['fundAmount']
    //check to see if user has enough LINK
    const accounts = await ethers.getSigners()
    const signer = accounts[0]
    const LinkToken = await ethers.getContractFactory("LinkToken")
    const linkTokenContract = new ethers.Contract(linkTokenAddress, LinkToken.interface, signer)
    const balanceHex = await linkTokenContract.balanceOf(signer.address)
    const balance = await web3.utils.toBN(balanceHex._hex).toString()
    const contractBalanceHex = await linkTokenContract.balanceOf(contractAddr)
    const contractBalance = await web3.utils.toBN(contractBalanceHex._hex).toString()
    if (balance > amount && amount > 0 && contractBalance < amount) {
        //user has enough LINK to auto-fund
        //and the contract isn't already funded
        return true
    } else { //user doesn't have enough LINK, print a warning
        console.log("Account doesn't have enough LINK to fund contracts, or you're deploying to a network where auto funding isnt' done by default")
        console.log("Please obtain LINK via the faucet at https://" + networkName + ".chain.link/, then run the following command to fund contract with LINK:")
        console.log("npx hardhat fund-link --contract " + contractAddr + " --network " + networkName + additionalMessage)
        return false
    }
}

module.exports = {
    networkConfig,
    getNetworkIdFromName,
    autoFundCheck,
    developmentChains,
    CONTRACTS,
}