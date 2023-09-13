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

  describe('Mint Genesis get reward on mint', () => {
    it('Mint Genesis should be reward with initial issuance + timely reward', async () => {
      await nft.togglePreMintActive();
      const amount = 1;
      const cost = (GENESIS_PRICE * amount).toFixed(3);
      const tx = await nft.connect(addr1).mintPre(amount, type, signature, {
        value: ethers.utils.parseEther(cost.toString()),  
      });

      const rewardAmount = await moonToken.rewards(addr1.address);
      const rewardAmountFormatted = ethers.utils.formatEther(rewardAmount);
      expect(rewardAmountFormatted).to.be.equal('50.0');

      const tx2 = await nft.connect(addr1).mintPre(amount, type, signature, {
        value: ethers.utils.parseEther(cost.toString()),
      });

      const rewardAmount2 = await moonToken.rewards(addr1.address);
      const rewardAmount2Formatted = ethers.utils.formatEther(rewardAmount2);
      expect(rewardAmount2Formatted).to.be.equal('100.00005787037037037');
    });
  });

  describe('Transfer NFT', () => {
    it('Transfer NFT from addr1 -> addr2 should update reward', async () => {
      await moonToken.connect(addr2).setAllowedAddresses(owner.address, true);
      const totalTokenToMint = ethers.utils.parseEther('5000');
      await moonToken.claimLaboratoryExperimentRewards(addr1.address, totalTokenToMint);

      await nft.togglePreMintActive();
      const amount = 2;
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
      
      const addr1ClaimableReward = await moonToken.connect(addr1).getTotalClaimable(addr1.address);
      const addr1ClaimableRewardFormatted = ethers.utils.formatEther(addr1ClaimableReward);
      expect(addr1ClaimableRewardFormatted).to.be.equal('100.00017361111111111');
      
      const addr2ClaimableReward = await moonToken.connect(addr1).getTotalClaimable(addr2.address);
      const addr2ClaimableRewardFormatted = ethers.utils.formatEther(addr2ClaimableReward);
      expect(addr2ClaimableRewardFormatted).to.be.equal('0.00005787037037037');
    });
  });

  describe('Claim Reward', () => {
    it('Addr1 mint genesis and wait for 2 blocks to cliam the reward', async () => {
      await nft.togglePreMintActive();
      const amount = 1;
      const cost = (GENESIS_PRICE * amount).toFixed(3);
      const tx = await nft.connect(addr1).mintPre(amount, type, signature, {
        value: ethers.utils.parseEther(cost.toString()),  
      });

      const rewardAmount = await moonToken.getTotalClaimable(addr1.address);
      const rewardAmountFormatted = ethers.utils.formatEther(rewardAmount);
      expect(rewardAmountFormatted).to.be.equal('50.0');

      await moonToken.connect(addr1).claimReward(); // claim reward to addr1 wallet
      const addr1TokenBalance = await moonToken.balanceOf(addr1.address);
      const addr1TokenBalanceFormatted = ethers.utils.formatEther(addr1TokenBalance);
      expect(addr1TokenBalanceFormatted).to.be.equal('50.00005787037037037');


      const rewardAmountAfter = await moonToken.getTotalClaimable(addr1.address);
      const rewardAmountAfterFormatted = ethers.utils.formatEther(rewardAmountAfter);
      expect(rewardAmountAfterFormatted).to.be.equal('0.0');

      await network.provider.send("evm_increaseTime", [86400]) // wait 1 day
      await network.provider.send("evm_mine")

      const rewardAmountAfterAfter = await moonToken.getTotalClaimable(addr1.address);
      const rewardAmountAfterAfterFormatted = ethers.utils.formatEther(rewardAmountAfterAfter);
      expect(rewardAmountAfterAfterFormatted).to.be.equal('5.0');
    })
  });
});