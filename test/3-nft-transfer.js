const { expect } = require("chai");
const { network } = require("hardhat");

const hashWhitelistAccount = (account, type) => {
  return Buffer.from(ethers.utils.solidityKeccak256(['address', 'uint256'], [account, type]).slice(2), 'hex')
}

describe("NFT Contract Transfer", () => {
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

  describe('Transfer NFT', () => {
    it('Transfer NFT from addr1 -> addr2 addr1 should not have it anymore addr2 should have it', async () => {
      await moonToken.connect(addr2).setAllowedAddresses(owner.address, true);
      const totalTokenToMint = ethers.utils.parseEther('5000');
      await moonToken.claimLaboratoryExperimentRewards(addr1.address, totalTokenToMint);

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

      const receipt = await tx.wait();
      const whalesMinted = receipt.events?.filter((x) => {return x.event == "WhalesMinted"});

      const tokenIds = [];

      for (let i = whalesMinted[0].args.startTokenId; i < amount; i++) {
        const owner = await nft.connect(addr1).ownerOf(i);
        expect(owner).to.equal(addr1.address);

        tokenIds.push(i);
      }

      const genesisCountBefore = await nft.genesisCount();
      expect(genesisCountBefore).to.be.equal(amount);

      const whale1 = tokenIds[0];
      const whale2 = tokenIds[1];

      try {
        await nft.connect(addr1).ownerOf(whale1);
      } catch (error) {
        expect(error.message).to.contain('ERC721: owner query for nonexistent token');
      }

      const from = addr1.address;
      const to = addr2.address;

      await nft.connect(addr1)["safeTransferFrom(address,address,uint256)"](from, to, whale1);

      try {
        await nft.connect(addr1).ownerOf(whale1);
      } catch (error) {
        expect(error.message).to.contain('ERC721: owner query for nonexistent token');
      }

      await nft.connect(addr1).transferFrom(from, to, whale2);

      try {
        await nft.connect(addr1).ownerOf(whale2);
      } catch (error) {
        expect(error.message).to.contain('ERC721: owner query for nonexistent token');
      }

      const tokensOwnedByAddr2 = await nft.walletOfOwner(addr2.address);
      expect(tokensOwnedByAddr2.length).to.be.equal(2);
    });
  });
});