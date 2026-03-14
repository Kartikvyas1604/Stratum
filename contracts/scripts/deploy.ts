import { config as dotenvConfig } from 'dotenv';
import { ethers } from 'hardhat';

dotenvConfig();

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();

  const feeRecipient = process.env.FEE_RECIPIENT ?? deployer.address;
  const feeBps = Number.parseInt(process.env.PLATFORM_FEE_BPS ?? '50', 10);

  const factory = await ethers.getContractFactory('NfcPosPaymentHub');
  const contract = await factory.deploy(deployer.address, feeRecipient, feeBps);
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  // eslint-disable-next-line no-console
  console.log('NfcPosPaymentHub deployed:', deployedAddress);
  // eslint-disable-next-line no-console
  console.log('Owner:', deployer.address);
  // eslint-disable-next-line no-console
  console.log('Fee recipient:', feeRecipient);
  // eslint-disable-next-line no-console
  console.log('Fee bps:', feeBps);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
