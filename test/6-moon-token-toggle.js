const { expect } = require("chai");
const { network } = require("hardhat");

const hashWhitelistAccount = (account, type) => {
  return Buffer.from(ethers.utils.solidityKeccak256(['address', 'uint256'], [account, type]).slice(2), 'hex')
}

describe("NFT Contract Reward", () => {
  let NFT;
  let nft;
  let provider;
  let GENESIS_PRICE;
  let type;
  let signature;
  const devMultisig = '0x8D4bAe1E6DD1239a4ba6dD68eeC76E178e469AcD';

  beforeEach(async () => {
    NFT = await ethers.getContractFactory('AlphieWhales');
    nft = await NFT.deploy(
      'AlphieWhales',
      'ALPHIE',
      'https://gateway.pinata.cloud/ipfs/Qmego24DURSSuijn1iVwbpiVFQG9WXKnUkiV4SErJmHJAd/',
      '0x6daea59468A6662D6cf6c2A51BA8FA0c7fc75B5D',
      '0x338B71a50326606Eab38cF3D09f8E8879a6b5c36',
      devMultisig,
    );

    [owner, addr1, addr2, _] = await ethers.getSigners();
    provider = ethers.provider;

    GENESIS_PRICE = ethers.utils.formatEther(await nft.GENESIS_PRICE());

    MoonToken = await ethers.getContractFactory('MoonToken');
    moonToken = await MoonToken.deploy(nft.address, addr2.address);

    await nft.setMoonToken(moonToken.address);
    await nft.connect(owner).setValidator(owner.address);
    type = 300; // 200 is 2 mints && 300 is 3 mints

    signature = await owner.signMessage(hashWhitelistAccount(addr1.address, type));
  });

  describe('Permission MoonToken', () => {
    it('setAllowedAddresses should pass with right account', async () => {
      const isAllowed = await moonToken.allowedAddresses(owner.address);

      expect(isAllowed).to.be.equal(false);
      await moonToken.connect(addr2).setAllowedAddresses(owner.address, true);

      const isAllowedAfter = await moonToken.allowedAddresses(owner.address);
      expect(isAllowedAfter).to.be.equal(true);
    });

    it('ToggleReward should pass with right account', async () => {
      await moonToken.connect(addr2).toggleReward();
    });

    it('setAllowedAddresses should fail because of permission', async () => {
      try {
        await moonToken.setAllowedAddresses(owner.address, true);
      } catch (error) {
        expect(error.message).to.contain('Address does not have permission');
      }
    });

    it('ToggleReward should fail because of permission', async () => {
      try {
        await moonToken.toggleReward();
      } catch (error) {
        expect(error.message).to.contain('Address does not have permission');
      }
    });
  });
});