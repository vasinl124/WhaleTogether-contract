const { expect } = require("chai");

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
    moonToken = await MoonToken.deploy(nft.address, devMultisig);

    await nft.setMoonToken(moonToken.address);

    await nft.connect(owner).setValidator(owner.address);
    type = 300; // 200 is 2 mints && 300 is 3 mints

    signature = await owner.signMessage(hashWhitelistAccount(addr1.address, type));
  });

  describe('Chanage Name', () => {
    it('Change NFT Name -> fail not enough Alphie Token', async () => {
      await nft.togglePreMintActive();
      const amount = 2;
      const cost = (GENESIS_PRICE * amount).toFixed(3);

      const tx = await nft.connect(addr1).mintPre(amount, type, signature, {
        value: ethers.utils.parseEther(cost.toString()),  
      });

      const receipt = await tx.wait();
      const whalesMinted = receipt.events?.filter((x) => {return x.event == "WhalesMinted"});

      const tokenIds = [];

      for (let i = whalesMinted[0].args.startTokenId; i < amount; i++) {
        const owner = await nft.connect(addr1).ownerOf(i);
        expect(owner).to.equal(addr1.address);

        tokenIds.push(i);
      }

      const whale1 = tokenIds[0];

      try {
        await nft.connect(addr1).changeName(whale1, 'newWhaleName');
      } catch (error) {
        expect(error.message).to.contain('ERC20: burn amount exceeds balance');
      }
    });

    it('Change NFT Name -> success', async () => {
      await nft.togglePreMintActive();
      const amount = 3;
      const cost = (GENESIS_PRICE * amount).toFixed(3);

      const tx = await nft.connect(addr1).mintPre(amount, type, signature, {
        value: ethers.utils.parseEther(cost.toString()),  
      });

      const receipt = await tx.wait();
      const whalesMinted = receipt.events?.filter((x) => {return x.event == "WhalesMinted"});

      const tokenIds = [];

      for (let i = whalesMinted[0].args.startTokenId; i < amount; i++) {
        const owner = await nft.connect(addr1).ownerOf(i);
        expect(owner).to.equal(addr1.address);

        tokenIds.push(i);
      }

      const whale1 = tokenIds[0];

      await moonToken.connect(addr1).claimReward(); // claim reward to addr1 wallet

      const addr1TokenBalance = await moonToken.balanceOf(addr1.address);
      const addr1TokenBalanceFormatted = ethers.utils.formatEther(addr1TokenBalance);
      console.log('addr1TokenBalanceFormatted->', addr1TokenBalanceFormatted);

      const newWhaleNameBefore = await nft.connect(addr1).whaleNames(whale1);
      console.log('newWhaleNameBefore->', newWhaleNameBefore);
      // claim reward first
      const name = 'totally different';
      await nft.connect(addr1).changeName(whale1, name);
      const newWhaleName = await nft.connect(addr1).whaleNames(whale1);

      console.log('newWhaleName->>>', newWhaleName);

      const addr1TokenBalanceAfter = await moonToken.balanceOf(addr1.address);
      const addr1TokenBalanceAfterFormatted = ethers.utils.formatEther(addr1TokenBalanceAfter);

      console.log('addr1TokenBalanceAfterFormatted->', addr1TokenBalanceAfterFormatted);
    });
  });
});
