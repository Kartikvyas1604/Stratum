import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('NfcPosPaymentHub', () => {
  it('settles native payments and marks invoice settled', async () => {
    const [owner, merchant, payer, feeRecipient] = await ethers.getSigners();

    const factory = await ethers.getContractFactory('NfcPosPaymentHub');
    const hub = await factory.deploy(owner.address, feeRecipient.address, 100);
    await hub.waitForDeployment();

    await hub.configureMerchant(merchant.address, true, merchant.address, 'merchant://demo');

    const invoiceId = ethers.id('invoice-1');
    const payerHash = ethers.id('payer-user-id');

    await expect(
      hub.connect(payer).payNative(invoiceId, merchant.address, payerHash, {
        value: ethers.parseEther('1'),
      }),
    ).to.emit(hub, 'PaymentRecorded');

    expect(await hub.settledInvoiceIds(invoiceId)).to.equal(true);
  });
});
