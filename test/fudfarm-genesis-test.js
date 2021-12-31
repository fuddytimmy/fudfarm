const { expect } = require("chai");
const { ethers } = require("hardhat");

/* TODO: 
    - Test public mint sale with fudfarm
    - Test use case where user says they minted 10 farmers
    - Demonstrate ability for a user to mint more than the allowed max in two separate transactions
    - Demonstrate the need for two separate mint counter variables for mint with crop and mint with eth. Current cap of 500 minted with crop is tied to eth counter. 
*/

beforeEach(async function () {

    accounts = await ethers.getSigners();
    owner = accounts[0];

    await deployDependencies();
});

describe("FudFarmGenesis Test crop mint", function () {
 
    it("should mint crop", async function () {

        // Fill whitelist array with accounts
        const cropMinters = [accounts[1].address, accounts[2].address, accounts[3].address];

        await cropToken.setWhitelist(cropMinters);
        
        // Attempt crop mint with whitelist account
        await cropToken.connect(accounts[1]).mint(accounts[1].address, "400000000000000000000");

        let balance = await cropToken.connect(accounts[0]).balanceOf(accounts[1].address);
        
        expect(balance).to.equal("400000000000000000000");
    });

    it("should show correct allowance", async function () {
        
        await cropToken.connect(accounts[1]).approve(fudFarmGenesis.address, "400000000000000000000", {from: accounts[1].address});

        let allowance = await cropToken.allowance(accounts[1].address, fudFarmGenesis.address);

        expect(allowance).to.equal("400000000000000000000");
    });

    it("should allow mint for eth", async function () {

        await fudFarmGenesis.setPublicStart(true);

        await fudFarmGenesis.connect(accounts[1]).mint(1, { value: ethers.utils.parseEther("0.04")}); // msg.value = 0.02 eth

        expect(await fudFarmGenesis.total()).to.equal(1);
    });
});

// I had an issue with token addresses. Keep in mind beforeEach runs before each it statement and was screwing everything up with different addresses on each test. 
describe("FudFarmGenesis Test mint with crop", function () {
 
    it("should allow mint with crop", async function () {

        accounts = await ethers.getSigners();
        owner = accounts[0];

        await deployDependencies();

        await fudFarmGenesis.setPublicStart(true);
        await fudFarmGenesis.setPresaleStart(true);

        // Fill whitelist array with accounts
        const cropMinters = [accounts[1].address, accounts[2].address, accounts[3].address];

        await cropToken.setWhitelist(cropMinters);
        
        // Attempt crop mint with whitelist account
        await cropToken.connect(accounts[1]).mint(accounts[1].address, "400000000000000000000");

        let balance = await cropToken.connect(accounts[0]).balanceOf(accounts[1].address);
        
        expect(balance).to.equal("400000000000000000000");

        // Fill whitelist array with accounts
        const fudderMinters = [accounts[1].address, accounts[2].address, accounts[3].address];

        await fudFarmGenesis.addToWhitelist(fudderMinters);

        await cropToken.connect(accounts[1]).approve(fudFarmGenesis.address, "400000000000000000000", {from: accounts[1].address});
         
        await fudFarmGenesis.connect(accounts[1]).presaleMint(1, "400000000000000000000"); // 400 CROP

        expect(await fudFarmGenesis.total()).to.equal(1);

        await fudFarmGenesis.connect(accounts[1]).mint(1, { value: ethers.utils.parseEther("0.04")}); // msg.value = 0.02 eth

        expect(await fudFarmGenesis.total()).to.equal(2);
    });
});

async function deployDependencies() {

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

    FudFarmGenesis = await ethers.getContractFactory("FudFarmGenesis");
    fudFarmGenesis = await FudFarmGenesis.deploy(
        "FudFarmGenesis",
        "FFG",
        "ipfs://QmaW33qhL8JD9D1cosCcrHGHtq8Q2krWfUYAgxGHnsz53p/",
        fudFarm.address,
        cropToken.address,
        "0xA096Fa33C27A9F6eE2E0fCeDBaA736dFb1288a61");
}