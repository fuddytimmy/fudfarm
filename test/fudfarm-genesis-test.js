const { expect } = require("chai");
const { ethers } = require("hardhat");
const ONE_FUDDER_CROP_AMOUNT = "400000000000000000000"; // 400 CROP
const THREE_FUDDER_CROP_AMOUNT = "1200000000000000000000"; // 1200 CROP

beforeEach(async function () {

    accounts = await ethers.getSigners();
    owner = accounts[0];
});

describe("FudFarmGenesis Test public mint with eth sale", function () {

    it("should allow mint for eth", async function () {

        await deployDependencies();

        await fudFarmGenesis.setPublicStart(true);

        await fudFarmGenesis.connect(accounts[1]).mint(1, { value: ethers.utils.parseEther("0.04")}); // msg.value = 0.02 eth

        expect(await fudFarmGenesis.total()).to.equal(1);
    });
});

describe("FudFarmGenesis Test presale mint not started", function () {
    it("should fail presale with presale not started", async function () {

        await deployDependencies();

        await fudFarmGenesis.setPresaleStart(false);

        await giveMeCropAndApproveSpend(ONE_FUDDER_CROP_AMOUNT);
        await giveMePresale();
        
        await expect(fudFarmGenesis.connect(accounts[1]).presaleMint(1, ONE_FUDDER_CROP_AMOUNT)).to.be.revertedWith('presale has not started.');
    });
});

describe("FudFarmGenesis Test presale mint without whitelist", function () {
    it("should fail presale without presale whitelist", async function () {

        await deployDependencies();

        await fudFarmGenesis.setPresaleStart(true);

        await giveMeCropAndApproveSpend(ONE_FUDDER_CROP_AMOUNT);

        // No presale
        //await giveMePresale();

        await expect(fudFarmGenesis.connect(accounts[1]).presaleMint(1, ONE_FUDDER_CROP_AMOUNT)).to.be.revertedWith('must be on presale whitelist');
    });
});

describe("FudFarmGenesis Test presale mint with crop and public mint with eth", function () {
    it("should allow both mint for crop and eth and demonstrate issue with shared total", async function () {

        await deployDependencies();

        await fudFarmGenesis.setPublicStart(true);
        await fudFarmGenesis.setPresaleStart(true);
        await fudFarmGenesis.setStart(true);

        await giveMeCropAndApproveSpend(ONE_FUDDER_CROP_AMOUNT);
        await giveMePresale();

        await fudFarmGenesis.connect(accounts[1]).presaleMint(1, ONE_FUDDER_CROP_AMOUNT);

        expect(await fudFarmGenesis.total()).to.equal(1);

        await fudFarmGenesis.connect(accounts[1]).mint(1, { value: ethers.utils.parseEther("0.04")});

        // This is a known issue in that the same total variable is used for both crop and 
        // eth mints. The max of 500 for crop sale would be hit earlier than expected. 
        expect(await fudFarmGenesis.total()).to.equal(2);
    });
});

describe("FudFarmGenesis Test public mint with crop and no fud farm", function () {
    it("should fail public mint with no fud farm held", async function () {

        await deployDependencies();

        await fudFarmGenesis.setPublicStart(true);
        await fudFarmGenesis.setStart(true);
        await fudFarmGenesis.setPresaleStart(false);

        await giveMeCropAndApproveSpend(ONE_FUDDER_CROP_AMOUNT);

        // No Fud Farm
        // await giveMeFudFarm();

        await expect(fudFarmGenesis.connect(accounts[1]).publicMint(1, ONE_FUDDER_CROP_AMOUNT)).to.be.revertedWith('must hold at least 1 fudFarm');
    });
});

describe("FudFarmGenesis Test public mint with crop and fud farm", function () {
    it("should allow public mint with crop and fud farm held", async function () {

        await deployDependencies();

        await fudFarmGenesis.setPublicStart(true);
        await fudFarmGenesis.setStart(true);
        await fudFarmGenesis.setPresaleStart(false);

        await giveMeCropAndApproveSpend(ONE_FUDDER_CROP_AMOUNT);
        await giveMeFudFarm();

        await fudFarmGenesis.connect(accounts[1]).publicMint(1, ONE_FUDDER_CROP_AMOUNT);

        expect(await fudFarmGenesis.total()).to.equal(1);
    });
});

describe("FudFarmGenesis Test presale mint over max amount", function () {
    it("should demonstrate issue with minting over presale max amount", async function () {

        await deployDependencies();

        await fudFarmGenesis.setPresaleStart(true);

        await giveMePresale();

        await giveMeCropAndApproveSpend(ONE_FUDDER_CROP_AMOUNT);
        await fudFarmGenesis.connect(accounts[1]).presaleMint(1, ONE_FUDDER_CROP_AMOUNT); 
        expect(await fudFarmGenesis.total()).to.equal(1);

        // This should never happen. We need to add requested mint amount to wallet amount 
        // to determine if max has been met and transaction should go through 
        await giveMeCropAndApproveSpend(THREE_FUDDER_CROP_AMOUNT);
        await fudFarmGenesis.connect(accounts[1]).presaleMint(3, THREE_FUDDER_CROP_AMOUNT); 
        expect(await fudFarmGenesis.total()).to.equal(4);

        await giveMeCropAndApproveSpend(ONE_FUDDER_CROP_AMOUNT);
        await expect(fudFarmGenesis.connect(accounts[1]).presaleMint(1, ONE_FUDDER_CROP_AMOUNT)).to.be.revertedWith('cannot have more than 3');
    });
});

async function deployDependencies() {

    // I had an issue with token addresses. Keep in mind beforeEach runs 
    // before each it statement and was screwing everything up with different 
    // addresses on each test. 

    FudFarm = await ethers.getContractFactory("FudFarm");
    fudFarm = await FudFarm.deploy(
       "FudFarm",
        "FUDFARM",
        "ipfs://QmaW33qhL8JD9D1cosCcrHGHtq8Q2krWfUYAgxGHnsz53p/"
    );

    CropToken = await ethers.getContractFactory("CropToken");
    cropToken = await CropToken.deploy(
        fudFarm.address,
        "1666666666666666",
        "3600000"); 

    FudFarmsStaking = await ethers.getContractFactory("FudFarmsStaking");
    fudFarmsStaking = await FudFarmsStaking.deploy();

    await fudFarmsStaking.setCropTokenAddress(cropToken.address);
    await fudFarmsStaking.setFudFarmTokenAddress(fudFarm.address);

    FudFarmGenesis = await ethers.getContractFactory("FudFarmGenesis");
    fudFarmGenesis = await FudFarmGenesis.deploy(
        "FudFarmGenesis",
        "FFG",
        "ipfs://QmaW33qhL8JD9D1cosCcrHGHtq8Q2krWfUYAgxGHnsz53p/",
        fudFarm.address,
        cropToken.address,
        fudFarmsStaking.address);
}

async function giveMeCropAndApproveSpend(tokenAmount) {
           
    // Fill whitelist array with accounts
    const cropMinters = [accounts[1].address, accounts[2].address, accounts[3].address];

    await cropToken.setWhitelist(cropMinters);
            
    // Attempt crop mint with whitelist account
    await cropToken.connect(accounts[1]).mint(accounts[1].address, tokenAmount);
    
    // Approve FudFarmGenesis contract spend of croptoken on behalf of account 1
    await cropToken.connect(accounts[1]).approve(fudFarmGenesis.address, tokenAmount, {from: accounts[1].address});
    
    let balance = await cropToken.connect(accounts[0]).balanceOf(accounts[1].address);     
    expect(balance).to.equal(tokenAmount);

    let allowance = await cropToken.allowance(accounts[1].address, fudFarmGenesis.address);
    expect(allowance).to.equal(tokenAmount);
}

async function giveMePresale() {

    // Fill whitelist array with accounts
    const fudderMinters = [accounts[1].address, accounts[2].address, accounts[3].address];

    await fudFarmGenesis.addToWhitelist(fudderMinters);
}

async function giveMeFudFarm() {

    // Mint a fud farm for fud farm held requirement
    await fudFarm.setStart(true);
    await fudFarm.connect(accounts[1]).mint(1, { value: ethers.utils.parseEther("0.03")});
}