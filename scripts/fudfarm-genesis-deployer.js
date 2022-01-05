async function main() {
  
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

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
        "ipfs://QmaKJaecdfCBJLcvoDo1nKsJ3Puc4igqW95gKshMCKT7zd/",
        fudFarm.address,
        cropToken.address,
        fudFarmsStaking.address);
}

main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
});