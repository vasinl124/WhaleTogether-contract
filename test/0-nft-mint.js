const { expect } = require("chai");

const hashWhitelistAccount = (account, type) => {
  return Buffer.from(ethers.utils.solidityKeccak256(['address', 'uint256'], [account, type]).slice(2), 'hex')
}

describe("NFT Contract", () => {
  let NFT;
  let nft;
  let provider;
  let GENESIS_PRICE;
  let REGULAR_PRICE;
  let chainId;

  let type;
  let signature;
  let devMultisig;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, _] = await ethers.getSigners();
    provider = ethers.provider;

    devMultisig = addr3.address;

    NFT = await ethers.getContractFactory('AlphieWhales');
    nft = await NFT.deploy(
      'AlphieWhales',
      'ALPHIE',
      'https://gateway.pinata.cloud/ipfs/Qmego24DURSSuijn1iVwbpiVFQG9WXKnUkiV4SErJmHJAd/',
      '0x6daea59468A6662D6cf6c2A51BA8FA0c7fc75B5D',
      '0x338B71a50326606Eab38cF3D09f8E8879a6b5c36',
      devMultisig,
    );

    GENESIS_PRICE = ethers.utils.formatEther(await nft.GENESIS_PRICE());

    MoonToken = await ethers.getContractFactory('MoonToken');
    moonToken = await MoonToken.deploy(nft.address, devMultisig);

    await nft.setMoonToken(moonToken.address);

    ({ chainId } = await ethers.provider.getNetwork());

    await nft.connect(owner).setValidator(owner.address);
    type = 300; // 200 is 2 mints && 300 is 3 mints

    signature = await owner.signMessage(hashWhitelistAccount(addr1.address, type));

  });

  describe('Deployment', () => {
    it('Should set the right owner', async () => {
      expect(await nft.owner()).to.equal(owner.address);
    });
  });

  describe('Mint Pre', () => {
    it('Mint Genesis should fail -> NOT Active', async () => {
      try {
        const amount = 1;
        const cost = GENESIS_PRICE * amount;

        const tx = await nft.connect(addr1).mintPre(amount, type, signature, {
          value: ethers.utils.parseEther(cost.toString()),  
        });
      } catch (error) {
        expect(error.message).to.contain('Must be active to mint');
      }
    });

    it('Mint Pre should fail -> More than their max token purchase', async () => {
      try {
        await nft.togglePreMintActive();
        const amount = 4; // Max per purchase is 3
        const cost = GENESIS_PRICE * amount;
        const tx = await nft.connect(addr1).mintPre(amount, type, signature, {
          value: ethers.utils.parseEther(cost.toString()),  
        });
      } catch (error) {
        expect(error.message).to.contain('Exceeds maximum tokens you can purchase in a single transaction');
      }
    });

    it('Mint Pre should fail -> when try to mint more on the second transaction', async () => {
      await nft.togglePreMintActive();
      const amount = 3;
      const cost = (GENESIS_PRICE * amount).toFixed(3);

      const amount2 = 1;
      const cost2 = (GENESIS_PRICE * amount2).toFixed(3);

      try {
        const [isWhitelistedBool, mintAmount] = await nft.connect(addr1).isWhitelisted(type, signature);
        expect(isWhitelistedBool).to.equal(true);
        expect(mintAmount).to.equal(3);

        const tx = await nft.connect(addr1).mintPre(amount, type, signature, {
          value: ethers.utils.parseEther(cost.toString()),  
        });

        const [isWhitelistedBool2, mintAmount2] = await nft.connect(addr1).isWhitelisted(type, signature);
        expect(isWhitelistedBool2).to.equal(true);
        expect(mintAmount2).to.equal(0);

        const tx2 = await nft.connect(addr1).mintPre(amount, type, signature, {
          value: ethers.utils.parseEther(cost.toString()),  
        });
      } catch (error) {
        expect(error.message).to.contain('Exceeds maximum tokens you can purchase in a single transaction');
      }
    });

    it('Mint Pre should fail -> Invalid signature', async () => {
      try {
        await nft.togglePreMintActive();
        const amount = 3;
        const cost = GENESIS_PRICE * amount;

        const wrongSignature = '0x2626038312321008e1a40bbd29d836e084de950766bb04700c7d7800b6907ebb3df51e0fdf49e323aa4054ea8e3f4b35aeecba1b3f6564ff0893d1c8aff814231b'
        const tx = await nft.connect(addr1).mintPre(amount, type, wrongSignature, {
          value: ethers.utils.parseEther(cost.toString()),  
        });
      } catch (error) {
        expect(error.message).to.contain('Invalid signature');
      }
    });

    it('Mint Pre should fail -> LESS Supply', async () => {
      await nft.togglePreMintActive();

      const _maxGenesisQuantity = 277; // gensisQuantity - genesis_reserve = 0
      await nft.setNewSupply(_maxGenesisQuantity);

      const amount = 3;
      const cost = (GENESIS_PRICE * amount).toFixed(3);

      try {
        const tx = await nft.connect(addr1).mintPre(amount, type, signature, {
          value: ethers.utils.parseEther(cost.toString()),  
        });
      } catch (error) {
        expect(error.message).to.contain('Exceeds maximum tokens available for purchase');
      }
    });

    it('Mint Pre should fail -> send lower ETH than 0.077 price -> Not enough ETH', async () => {
      await nft.togglePreMintActive();

      const amount = 1;
      const cost = 0.076;

      try {
        const tx = await nft.connect(addr1).mintPre(amount, type, signature, {
          value: ethers.utils.parseEther(cost.toString()),  
        });        
      } catch (error) {
        expect(error.message).to.contain('ETH amount is not sufficient');
      }
    });

    it('Mint Pre should fail -> Not enough ETH', async () => {
      await nft.togglePreMintActive();

      const amount = 3;
      const cost = 0;

      try {
        const tx = await nft.connect(addr1).mintPre(amount, type, signature, {
          value: ethers.utils.parseEther(cost.toString()),  
        });
      } catch (error) {
        expect(error.message).to.contain('ETH amount is not sufficient');
      }
    });

    it('Mint Pre should fail -> cost = null -> Not enough ETH', async () => {
      await nft.togglePreMintActive();

      const amount = 3;

      try {
        const tx = await nft.connect(addr1).mintPre(amount, type, signature, {
          value: null,  
        });  
      } catch (error) {
        expect(error.message).to.contain('ETH amount is not sufficient');
      }
    });

    it('Mint Pre should ALL PASS', async () => {
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
      expect(whalesMinted).to.length(1);

      for (let i = whalesMinted[0].args.startTokenId; i < amount; i++) {
        const owner = await nft.connect(addr1).ownerOf(i);
        expect(owner).to.equal(addr1.address);
      }
    });
  });



  describe('Mint Public', () => {
    it('Mint Public should fail -> NOT Active', async () => {
      try {
        const amount = 1;
        const cost = (GENESIS_PRICE * amount).toFixed(3);
        const tx = await nft.connect(addr1).mintPublic(amount, {
          value: ethers.utils.parseEther(cost.toString()),  
        });
      } catch (error) {
        expect(error.message).to.contain('Must be active to mint');
      }
    });

    it('Mint Regular should fail -> More than MAX_PER_PURCHASE', async () => {
      try {
        await nft.togglePublicMintActive();
        const amount = 3; // Max per purchase is 2
        const cost = (GENESIS_PRICE * amount).toFixed(3);
        const tx = await nft.connect(addr1).mintPublic(amount, { 
          value: ethers.utils.parseEther(cost.toString()),  
        });
      } catch (error) {
        expect(error.message).to.contain('Exceeds maximum tokens you can purchase in a single transaction');
      }
    });

    it('Mint Regular should ALL PASS', async () => {
      await nft.togglePublicMintActive();
      const amount = 2;
      const cost = (GENESIS_PRICE * amount).toFixed(3);
      const tx = await nft.connect(addr1).mintPublic(amount, {
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
    });
  });

  describe('Owner Reserve Genesis Tokens', () => {
    it('Mint Reserve Alphies', async () => {      
      const amount = 50;
      await nft.connect(addr3).reserveGenesisTokens(amount);
      await nft.connect(addr3).reserveGenesisTokens(amount);
      await nft.connect(addr3).reserveGenesisTokens(amount);
      await nft.connect(addr3).reserveGenesisTokens(amount);
      await nft.connect(addr3).reserveGenesisTokens(amount);
      await nft.connect(addr3).reserveGenesisTokens(27);

      const GENESIS_RESERVE = await nft.GENESIS_RESERVE();
      expect(GENESIS_RESERVE).to.be.equal(0);

      const genesisCount = await nft.genesisCount();
      const balanceGenesisWhales = await nft.balanceGenesisWhales(devMultisig);
      const ownerBalanceGenesisWhales = await nft.balanceGenesisWhales(owner.address);

      expect(genesisCount).to.equal(277);
      expect(balanceGenesisWhales).to.equal(277);
      expect(ownerBalanceGenesisWhales).to.equal(0);
    });
  });
});
