const { expect } = require("chai");

const hashWhitelistAccount = (account, type) => {
  return Buffer.from(ethers.utils.solidityKeccak256(['address', 'uint256'], [account, type]).slice(2), 'hex')
}

describe("Dev Wallet Contract", () => {
  let NFT;
  let nft;
  let provider;
  let GENESIS_PRICE;
  let REGULAR_PRICE;
  let type;
  let signature;
  let devMultisig;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, _] = await ethers.getSigners();
    provider = ethers.provider;

    devMultisig = addr3.address;

    const wethAddress = '0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa';
    DevWallet = await ethers.getContractFactory('DevWallet');
    devWallet = await DevWallet.deploy(
      wethAddress, 
      [
        addr1.address,
        addr2.address,
        addr2.address,
        addr2.address,
        addr2.address,
        addr2.address,
      ],
      '0x8D4bAe1E6DD1239a4ba6dD68eeC76E178e469AcD',
    );

    NFT = await ethers.getContractFactory('AlphieWhales');
    nft = await NFT.deploy(
      'AlphieWhales',
      'ALPHIE',
      'https://gateway.pinata.cloud/ipfs/Qmego24DURSSuijn1iVwbpiVFQG9WXKnUkiV4SErJmHJAd/',
      '0x6daea59468A6662D6cf6c2A51BA8FA0c7fc75B5D',
      devWallet.address,
      devMultisig,
    );

    GENESIS_PRICE = ethers.utils.formatEther(await nft.GENESIS_PRICE());

    MoonToken = await ethers.getContractFactory('MoonToken');
    moonToken = await MoonToken.deploy(nft.address, addr2.address);

    await nft.setMoonToken(moonToken.address);

    await nft.connect(owner).setValidator(owner.address);
    type = 300; // 200 is 2 mints && 300 is 3 mints

    signature = await owner.signMessage(hashWhitelistAccount(addr1.address, type));
  });

  describe('Dev Wallet', () => {
    it('Withdraw to Dev Wallet should fail -> no ETH left', async () => {
      try {
        await nft.connect(addr3).withdrawBalanceToDev();
      } catch (error) {
        expect(error.message).to.contain('No ETH left');
      }
    });

    it('Get paid to contract and withdraw to Dev Wallet', async () => {
      await nft.togglePreMintActive();
      const amount = 3;
      const cost = (GENESIS_PRICE * amount).toFixed(3);
      const tx = await nft.connect(addr1).mintPre(amount, type, signature, {
        value: ethers.utils.parseEther(cost.toString()),  
      });
      expect(tx).to.be.an('object');

      const genesisCount = await nft.genesisCount();
      const balanceGenesisWhales = await nft.balanceGenesisWhales(addr1.address);
      expect(genesisCount).to.equal(amount);
      expect(balanceGenesisWhales).to.equal(amount);

      let receipt = await tx.wait();

      const whalesMinted = receipt.events?.filter((x) => {return x.event == "WhalesMinted"});

      for (let i = whalesMinted[0].args.startTokenId; i < amount; i++) {
        const owner = await nft.connect(addr1).ownerOf(i);
        expect(owner).to.equal(addr1.address);
      }

      await nft.connect(addr3).withdrawBalanceToDev();

      const devWalletETHBalance = await provider.getBalance(devWallet.address);
      expect(ethers.utils.formatEther(devWalletETHBalance)).to.be.equal(cost.toString());
    });

    it('set New Dev Wallet', async () => {
      const tx = await nft.connect(addr3).setDevWalletAddress('0x338B71a50326606Eab38cF3D09f8E8879a6b5c36');
      expect(tx).to.be.an('object');
    });

    it('withdraw token to Dev Wallet should fail -> no fund left', async () => {
      try {
        await nft.connect(addr3).withdrawTokensToDev(moonToken.address);
      } catch (error) {
        expect(error.message).to.contain('No token left');
      }
    });

    it('withdraw token to Dev Wallet', async () => {
      await moonToken.connect(addr2).setAllowedAddresses(owner.address, true);
      const totalTokenToMint = ethers.utils.parseEther('5000');
      await moonToken.claimLaboratoryExperimentRewards(nft.address, totalTokenToMint);

      await nft.connect(addr3).withdrawTokensToDev(moonToken.address);

      const devWalletTokenBalance = await moonToken.balanceOf(devWallet.address);
      expect(devWalletTokenBalance).to.be.equal(totalTokenToMint.toString());
    });
  });
});

describe("Dev Wallet Contract 2 Interact with Dev Wallet", () => {
  let NFT;
  let nft;
  let provider;
  let GENESIS_PRICE;
  let REGULAR_PRICE;
  let type;
  let signature;
  let devMultisig;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, _] = await ethers.getSigners();
    provider = ethers.provider;

    devMultisig = addr3.address;

    WETH = await ethers.getContractFactory('WETH');
    wETH = await WETH.deploy(ethers.utils.parseEther('1000'));

    DevWallet = await ethers.getContractFactory('DevWallet');
    devWallet = await DevWallet.deploy(
      wETH.address, 
      [
        addr1.address,
        addr2.address,
        addr2.address,
        addr2.address,
        addr2.address,
        addr2.address,
      ],
      '0x8D4bAe1E6DD1239a4ba6dD68eeC76E178e469AcD',
    );

    wETH.transfer(devWallet.address, ethers.utils.parseEther('100'));


    NFT = await ethers.getContractFactory('AlphieWhales');
    nft = await NFT.deploy(
      'AlphieWhales',
      'ALPHIE',
      'https://gateway.pinata.cloud/ipfs/Qmego24DURSSuijn1iVwbpiVFQG9WXKnUkiV4SErJmHJAd/',
      '0x6daea59468A6662D6cf6c2A51BA8FA0c7fc75B5D',
      devWallet.address,
      devMultisig,
    );

    GENESIS_PRICE = ethers.utils.formatEther(await nft.GENESIS_PRICE());

    MoonToken = await ethers.getContractFactory('MoonToken');
    moonToken = await MoonToken.deploy(nft.address, devMultisig);

    await nft.setMoonToken(moonToken.address);

    await nft.connect(owner).setValidator(owner.address);
    type = 300; // 200 is 2 mints && 300 is 3 mints

    signature = await owner.signMessage(hashWhitelistAccount(addr1.address, type));

    await nft.togglePreMintActive();
    const amount = 3;
    const cost = (GENESIS_PRICE * amount).toFixed(3);
    const tx = await nft.connect(addr1).mintPre(amount, type, signature, {
      value: ethers.utils.parseEther(cost.toString()),  
    });

    let receipt = await tx.wait();

    const whalesMinted = receipt.events?.filter((x) => {return x.event == "WhalesMinted"});

    for (let i = whalesMinted[0].args.startTokenId; i < amount; i++) {
      const owner = await nft.connect(addr1).ownerOf(i);
      expect(owner).to.equal(addr1.address);
    }

    await nft.connect(addr3).withdrawBalanceToDev();
  });

  describe('Dev Wallet', () => {
    it('withdraw ETH from Dev Wallet to founder wallet', async () => {
      const devWalletETHBalance = await provider.getBalance(devWallet.address);

      await devWallet.connect(addr1).withdraw((devWalletETHBalance * (15/100)).toString());

      const devWalletETHBalanceAfter = await provider.getBalance(devWallet.address);
      expect(devWalletETHBalanceAfter).to.be.equal((devWalletETHBalance * (85/100)).toString());
    });

    it('withdraw ETH from Dev Wallet to founder wallet should fail because amount is 0', async () => {
      try {
        await devWallet.connect(addr1).withdraw(ethers.utils.parseEther('0'));
      } catch (error) {
        expect(error.message).to.contain("Amount cannot be 0");
      }
    });

    it('withdraw WETH from Dev Wallet to founder wallet', async () => {
      const wETHBalanceInDevWallet = await wETH.balanceOf(devWallet.address);
      expect(wETHBalanceInDevWallet).to.be.equal(ethers.utils.parseEther('100'));

      const pendingWETHBalance = await devWallet.connect(addr1).getPendingWETHBalance();
      expect(pendingWETHBalance).to.be.equal(ethers.utils.parseEther('15'));

      await devWallet.connect(addr1).releaseWETH(ethers.utils.parseEther('5'));

      const pendingWETHBalanceAfter = await devWallet.connect(addr1).getPendingWETHBalance();

      const wETHBalanceInDevWalletAfter = await wETH.balanceOf(devWallet.address);

      expect(pendingWETHBalanceAfter).to.be.equal(ethers.utils.parseEther('10'));
      expect(wETHBalanceInDevWalletAfter).to.be.equal(ethers.utils.parseEther('95'));


      await devWallet.connect(addr1).releaseWETH(ethers.utils.parseEther('5'));
      
      const pendingWETHBalanceAfterAfter = await devWallet.connect(addr1).getPendingWETHBalance();
      expect(pendingWETHBalanceAfterAfter).to.be.equal(ethers.utils.parseEther('5'));

      await devWallet.connect(addr1).releaseWETH(ethers.utils.parseEther('5'));

      const pendingWETHBalanceAfterAfterAfter = await devWallet.connect(addr1).getPendingWETHBalance();
      expect(pendingWETHBalanceAfterAfterAfter).to.be.equal(ethers.utils.parseEther('0'));

      try {
        await devWallet.connect(addr1).releaseWETH(ethers.utils.parseEther('1'));
      } catch (error) {
        expect(error.message).to.contain("TokenPaymentSplitter: account is not due payment");
      }
    });

    it('withdraw WETH from Dev Wallet to founder wallet should fail withdraw more than totalPayable', async () => {
      const wETHBalanceInDevWallet = await wETH.balanceOf(devWallet.address);
      expect(wETHBalanceInDevWallet).to.be.equal(ethers.utils.parseEther('100'));

      const pendingWETHBalance = await devWallet.connect(addr1).getPendingWETHBalance();
      expect(pendingWETHBalance).to.be.equal(ethers.utils.parseEther('15'));

      try {
        await devWallet.connect(addr1).releaseWETH(ethers.utils.parseEther('25'));
      } catch (error) {
        expect(error.message).to.contain("can't withdraw more than that");
      }
    });

    it('withdraw WETH from Dev Wallet to founder wallet should fail because amount is 0', async () => {
      const wETHBalanceInDevWallet = await wETH.balanceOf(devWallet.address);
      expect(wETHBalanceInDevWallet).to.be.equal(ethers.utils.parseEther('100'));

      const pendingWETHBalance = await devWallet.connect(addr1).getPendingWETHBalance();
      expect(pendingWETHBalance).to.be.equal(ethers.utils.parseEther('15'));

      try {
        await devWallet.connect(addr1).releaseWETH(ethers.utils.parseEther('0'));
      } catch (error) {
        expect(error.message).to.contain("Amount cannot be 0");
      }
    });
  });
});
