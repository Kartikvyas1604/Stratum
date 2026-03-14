// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from '@openzeppelin/contracts/access/Ownable2Step.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

/**
 * @title NfcPosPaymentHub
 * @notice On-chain settlement hub for NFC POS payments.
 * @dev This contract records immutable payment receipts and supports native ETH and ERC20 tokens.
 */
contract NfcPosPaymentHub is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct MerchantConfig {
        bool active;
        address payout;
        string metadataURI;
    }

    mapping(address => MerchantConfig) public merchants;
    mapping(bytes32 => bool) public settledInvoiceIds;

    uint16 public platformFeeBps;
    address public feeRecipient;

    event MerchantConfigured(address indexed merchant, bool active, address payout, string metadataURI);
    event PlatformFeeUpdated(uint16 feeBps, address indexed feeRecipient);
    event PaymentRecorded(
        bytes32 indexed invoiceId,
        address indexed merchant,
        address indexed payer,
        address token,
        uint256 grossAmount,
        uint256 feeAmount,
        bytes32 payerUserHash
    );

    error MerchantInactive();
    error InvalidInvoiceId();
    error InvoiceAlreadySettled();
    error InvalidFeeBps();
    error InvalidRecipient();
    error AmountZero();

    constructor(address initialOwner, address initialFeeRecipient, uint16 initialFeeBps) Ownable(initialOwner) {
        if (initialFeeRecipient == address(0)) {
            revert InvalidRecipient();
        }
        if (initialFeeBps > 1000) {
            revert InvalidFeeBps();
        }

        feeRecipient = initialFeeRecipient;
        platformFeeBps = initialFeeBps;
    }

    function configureMerchant(address merchant, bool active, address payout, string calldata metadataURI) external onlyOwner {
        if (merchant == address(0) || payout == address(0)) {
            revert InvalidRecipient();
        }

        merchants[merchant] = MerchantConfig({active: active, payout: payout, metadataURI: metadataURI});
        emit MerchantConfigured(merchant, active, payout, metadataURI);
    }

    function setPlatformFee(uint16 nextFeeBps, address nextFeeRecipient) external onlyOwner {
        if (nextFeeBps > 1000) {
            revert InvalidFeeBps();
        }
        if (nextFeeRecipient == address(0)) {
            revert InvalidRecipient();
        }

        platformFeeBps = nextFeeBps;
        feeRecipient = nextFeeRecipient;
        emit PlatformFeeUpdated(nextFeeBps, nextFeeRecipient);
    }

    function payNative(bytes32 invoiceId, address merchant, bytes32 payerUserHash) external payable nonReentrant {
        if (invoiceId == bytes32(0)) {
            revert InvalidInvoiceId();
        }
        if (msg.value == 0) {
            revert AmountZero();
        }
        if (settledInvoiceIds[invoiceId]) {
            revert InvoiceAlreadySettled();
        }

        MerchantConfig memory merchantConfig = merchants[merchant];
        if (!merchantConfig.active) {
            revert MerchantInactive();
        }

        settledInvoiceIds[invoiceId] = true;

        uint256 feeAmount = (msg.value * platformFeeBps) / 10_000;
        uint256 merchantAmount = msg.value - feeAmount;

        (bool paidMerchant, ) = payable(merchantConfig.payout).call{value: merchantAmount}('');
        require(paidMerchant, 'merchant transfer failed');

        if (feeAmount > 0) {
            (bool paidFee, ) = payable(feeRecipient).call{value: feeAmount}('');
            require(paidFee, 'fee transfer failed');
        }

        emit PaymentRecorded(invoiceId, merchant, msg.sender, address(0), msg.value, feeAmount, payerUserHash);
    }

    function payErc20(bytes32 invoiceId, address merchant, address token, uint256 amount, bytes32 payerUserHash)
        external
        nonReentrant
    {
        if (invoiceId == bytes32(0)) {
            revert InvalidInvoiceId();
        }
        if (amount == 0) {
            revert AmountZero();
        }
        if (settledInvoiceIds[invoiceId]) {
            revert InvoiceAlreadySettled();
        }

        MerchantConfig memory merchantConfig = merchants[merchant];
        if (!merchantConfig.active) {
            revert MerchantInactive();
        }

        settledInvoiceIds[invoiceId] = true;

        uint256 feeAmount = (amount * platformFeeBps) / 10_000;
        uint256 merchantAmount = amount - feeAmount;

        IERC20(token).safeTransferFrom(msg.sender, merchantConfig.payout, merchantAmount);

        if (feeAmount > 0) {
            IERC20(token).safeTransferFrom(msg.sender, feeRecipient, feeAmount);
        }

        emit PaymentRecorded(invoiceId, merchant, msg.sender, token, amount, feeAmount, payerUserHash);
    }
}
