const { expect } = require("chai");

const hashWhitelistAccount = (account, type) => {
  return Buffer.from(ethers.utils.solidityKeccak256(['address', 'uint256'], [account, type]).slice(2), 'hex')
}

describe("NFT Contract", () => {
  let NFT;
  let nft;
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

    GENESIS_PRICE = ethers.utils.formatEther(await nft.GENESIS_PRICE());

    MoonToken = await ethers.getContractFactory('MoonToken');
    moonToken = await MoonToken.deploy(nft.address, devMultisig);

    await nft.setMoonToken(moonToken.address);

    await nft.connect(owner).setValidator(owner.address);
    type = 300; // 200 is 2 mints && 300 is 3 mints

    signature = await owner.signMessage(hashWhitelistAccount(addr1.address, type));
  });

  describe('Whitelist', () => {
    it('Whitelist user first time checking  -> should show isWhitelisted: true and 3 mintAmount', async () => {
      const [isWhitelisted, mintAmount] = await nft.connect(addr1).isWhitelisted(type, signature);
      expect(isWhitelisted).to.be.equal(true);
      expect(mintAmount).to.be.equal(3);
    });

    it('mint 2 and should show mintAmount down to 1', async () => {
      const [isWhitelisted, mintAmount] = await nft.connect(addr1).isWhitelisted(type, signature);
      expect(isWhitelisted).to.be.equal(true);
      expect(mintAmount).to.be.equal(3);

      await nft.togglePreMintActive();

      const amount = 2;
      const cost = (GENESIS_PRICE * amount).toFixed(3);

      const tx = await nft.connect(addr1).mintPre(amount, type, signature, {
        value: ethers.utils.parseEther(cost.toString()),  
      });

      const [isWhitelistedAfter, mintAmountAfter] = await nft.connect(addr1).isWhitelisted(type, signature);
      expect(isWhitelistedAfter).to.be.equal(true);
      expect(mintAmountAfter).to.be.equal(1);

    });
  });
});
