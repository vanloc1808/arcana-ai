"""
Tests for Ethereum Service

This module contains comprehensive unit tests for the EthereumService class,
covering payment verification, transaction processing, and blockchain interactions.
"""

import pytest
from decimal import Decimal
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.exc import SQLAlchemyError

from services.ethereum_service import EthereumService
from models import EthereumTransaction, User
from tests.factories import UserFactory


class TestEthereumService:
    """Test suite for EthereumService class."""

    @patch('services.ethereum_service.Web3')
    @patch('services.ethereum_service.settings')
    def test_init_successful_connection(self, mock_settings, mock_web3):
        """Test successful initialization with Web3 connection."""
        # Setup mocks
        mock_settings.ETHEREUM_RPC_URL = "https://test.rpc.url"
        mock_settings.ETHEREUM_PAYMENT_ADDRESS = "0x1234567890123456789012345678901234567890"

        mock_w3_instance = Mock()
        mock_w3_instance.is_connected.return_value = True
        mock_web3.HTTPProvider.return_value = Mock()
        mock_web3.return_value = mock_w3_instance

        # Create service
        service = EthereumService()

        # Assertions
        assert service.rpc_url == "https://test.rpc.url"
        assert service.payment_address == "0x1234567890123456789012345678901234567890"
        assert service.w3 == mock_w3_instance
        assert service.is_connected() is True

    @patch('services.ethereum_service.Web3')
    @patch('services.ethereum_service.settings')
    def test_init_connection_failure(self, mock_settings, mock_web3):
        """Test initialization when Web3 connection fails."""
        # Setup mocks
        mock_settings.ETHEREUM_RPC_URL = "https://test.rpc.url"
        mock_settings.ETHEREUM_PAYMENT_ADDRESS = "0x1234567890123456789012345678901234567890"

        mock_w3_instance = Mock()
        mock_w3_instance.is_connected.return_value = False
        mock_web3.HTTPProvider.return_value = Mock()
        mock_web3.return_value = mock_w3_instance

        # Create service
        service = EthereumService()

        # Assertions - Web3 instance creation may fail completely
        # The service may not have a w3 instance if connection fails
        assert service.is_connected() is False

    @patch('services.ethereum_service.Web3')
    @patch('services.ethereum_service.settings')
    def test_init_web3_exception(self, mock_settings, mock_web3):
        """Test initialization when Web3 raises an exception."""
        # Setup mocks
        mock_settings.ETHEREUM_RPC_URL = "https://test.rpc.url"
        mock_settings.ETHEREUM_PAYMENT_ADDRESS = "0x1234567890123456789012345678901234567890"

        mock_web3.HTTPProvider.side_effect = Exception("Connection failed")
        mock_web3.return_value = Mock()

        # Create service
        service = EthereumService()

        # Assertions
        assert service.w3 is None
        assert service.is_connected() is False

    def test_is_connected_with_none_w3(self):
        """Test is_connected when w3 is None."""
        service = EthereumService()
        service.w3 = None

        assert service.is_connected() is False

    def test_get_expected_eth_amount_valid_variants(self):
        """Test getting expected ETH amounts for valid product variants."""
        service = EthereumService()

        assert service.get_expected_eth_amount("10_turns") == Decimal("0.0016")
        assert service.get_expected_eth_amount("20_turns") == Decimal("0.0024")

    def test_get_expected_eth_amount_invalid_variant(self):
        """Test getting expected ETH amount for invalid product variant."""
        service = EthereumService()

        assert service.get_expected_eth_amount("invalid_variant") == Decimal("0")
        assert service.get_expected_eth_amount("") == Decimal("0")
        assert service.get_expected_eth_amount(None) == Decimal("0")

    def test_get_turns_for_variant_valid_variants(self):
        """Test getting turns for valid product variants."""
        service = EthereumService()

        assert service.get_turns_for_variant("10_turns") == 10
        assert service.get_turns_for_variant("20_turns") == 20

    def test_get_turns_for_variant_invalid_variant(self):
        """Test getting turns for invalid product variant."""
        service = EthereumService()

        assert service.get_turns_for_variant("invalid_variant") == 0
        assert service.get_turns_for_variant("") == 0
        assert service.get_turns_for_variant(None) == 0

    @patch('services.ethereum_service.EthereumService.is_connected')
    def test_verify_transaction_not_connected(self, mock_is_connected):
        """Test transaction verification when not connected to network."""
        mock_is_connected.return_value = False

        service = EthereumService()
        result = service.verify_transaction(
            "0x1234567890abcdef",
            Decimal("0.0016"),
            "0xabcdef1234567890"
        )

        expected = {
            "verified": False,
            "error": "Unable to connect to Ethereum network",
            "details": {}
        }
        assert result == expected

    @patch('services.ethereum_service.EthereumService.is_connected')
    def test_verify_transaction_not_found(self, mock_is_connected):
        """Test transaction verification when transaction is not found."""
        mock_is_connected.return_value = True

        service = EthereumService()
        service.w3 = Mock()
        service.w3.eth.get_transaction.return_value = None

        result = service.verify_transaction(
            "0x1234567890abcdef",
            Decimal("0.0016"),
            "0xabcdef1234567890"
        )

        expected = {
            "verified": False,
            "error": "Transaction not found",
            "details": {}
        }
        assert result == expected

    @patch('services.ethereum_service.EthereumService.is_connected')
    def test_verify_transaction_failed_status(self, mock_is_connected):
        """Test transaction verification when transaction failed."""
        mock_is_connected.return_value = True

        service = EthereumService()
        service.w3 = Mock()

        # Mock transaction
        mock_tx = {
            "value": 1600000000000000,  # 0.0016 ETH in wei
            "to": "0x0146311bdb312198b64c905fc249a35770dd9193",
            "from": "0xabcdef1234567890abcdef1234567890abcdef12"
        }
        service.w3.eth.get_transaction.return_value = mock_tx

        # Mock receipt with failed status
        mock_receipt = Mock()
        mock_receipt.status = 0  # Failed
        service.w3.eth.get_transaction_receipt.return_value = mock_receipt

        result = service.verify_transaction(
            "0x1234567890abcdef",
            Decimal("0.0016"),
            "0xabcdef1234567890abcdef1234567890abcdef12"
        )

        assert result["verified"] is False
        assert "Transaction failed or not confirmed" in result["error"]

    @patch('services.ethereum_service.EthereumService.is_connected')
    def test_verify_transaction_wrong_recipient(self, mock_is_connected):
        """Test transaction verification with wrong recipient address."""
        mock_is_connected.return_value = True

        service = EthereumService()
        service.w3 = Mock()
        service.payment_address = "0x0146311bdb312198b64c905fc249a35770dd9193"

        # Mock transaction to wrong address
        mock_tx = {
            "value": 1600000000000000,  # 0.0016 ETH in wei
            "to": "0xwrongaddress123456789012345678901234567890",
            "from": "0xabcdef1234567890abcdef1234567890abcdef12"
        }
        service.w3.eth.get_transaction.return_value = mock_tx

        # Mock successful receipt
        mock_receipt = Mock()
        mock_receipt.status = 1
        mock_receipt.blockNumber = 1000
        service.w3.eth.get_transaction_receipt.return_value = mock_receipt
        service.w3.eth.block_number = 1005

        result = service.verify_transaction(
            "0x1234567890abcdef",
            Decimal("0.0016"),
            "0xabcdef1234567890abcdef1234567890abcdef12"
        )

        assert result["verified"] is False
        assert "not sent to payment address" in result["error"]

    @patch('services.ethereum_service.EthereumService.is_connected')
    def test_verify_transaction_wrong_sender(self, mock_is_connected):
        """Test transaction verification with wrong sender address."""
        mock_is_connected.return_value = True

        service = EthereumService()
        service.w3 = Mock()
        service.payment_address = "0x0146311bdb312198b64c905fc249a35770dd9193"

        # Mock transaction from wrong sender
        mock_tx = {
            "value": 1600000000000000,  # 0.0016 ETH in wei
            "to": "0x0146311bdb312198b64c905fc249a35770dd9193",
            "from": "0xwrongsender123456789012345678901234567890"
        }
        service.w3.eth.get_transaction.return_value = mock_tx

        # Mock successful receipt
        mock_receipt = Mock()
        mock_receipt.status = 1
        mock_receipt.blockNumber = 1000
        service.w3.eth.get_transaction_receipt.return_value = mock_receipt
        service.w3.eth.block_number = 1005

        result = service.verify_transaction(
            "0x1234567890abcdef",
            Decimal("0.0016"),
            "0xabcdef1234567890abcdef1234567890abcdef12"
        )

        assert result["verified"] is False
        assert "not from expected sender" in result["error"]

    @patch('services.ethereum_service.EthereumService.is_connected')
    def test_verify_transaction_wrong_amount(self, mock_is_connected):
        """Test transaction verification with wrong amount."""
        mock_is_connected.return_value = True

        service = EthereumService()
        service.w3 = Mock()
        service.payment_address = "0x0146311bdb312198b64c905fc249a35770dd9193"

        # Mock transaction with wrong amount (0.002 ETH instead of 0.0016)
        mock_tx = {
            "value": 2000000000000000,  # 0.002 ETH in wei
            "to": "0x0146311bdb312198b64c905fc249a35770dd9193",
            "from": "0xabcdef1234567890abcdef1234567890abcdef12"
        }
        service.w3.eth.get_transaction.return_value = mock_tx

        # Mock successful receipt
        mock_receipt = Mock()
        mock_receipt.status = 1
        mock_receipt.blockNumber = 1000
        service.w3.eth.get_transaction_receipt.return_value = mock_receipt
        service.w3.eth.block_number = 1005

        result = service.verify_transaction(
            "0x1234567890abcdef",
            Decimal("0.0016"),
            "0xabcdef1234567890abcdef1234567890abcdef12"
        )

        assert result["verified"] is False
        assert "Incorrect payment amount" in result["error"]

    @patch('services.ethereum_service.EthereumService.is_connected')
    def test_verify_transaction_insufficient_confirmations(self, mock_is_connected):
        """Test transaction verification with insufficient confirmations."""
        mock_is_connected.return_value = True

        service = EthereumService()
        service.w3 = Mock()
        service.payment_address = "0x0146311bdb312198b64c905fc249a35770dd9193"

        # Mock transaction
        mock_tx = {
            "value": 1600000000000000,  # 0.0016 ETH in wei
            "to": "0x0146311bdb312198b64c905fc249a35770dd9193",
            "from": "0xabcdef1234567890abcdef1234567890abcdef12"
        }
        service.w3.eth.get_transaction.return_value = mock_tx

        # Mock receipt in latest block (0 confirmations)
        mock_receipt = Mock()
        mock_receipt.status = 1
        mock_receipt.blockNumber = 1005
        service.w3.eth.get_transaction_receipt.return_value = mock_receipt
        service.w3.eth.block_number = 1005

        result = service.verify_transaction(
            "0x1234567890abcdef",
            Decimal("0.0016"),
            "0xabcdef1234567890abcdef1234567890abcdef12"
        )

        assert result["verified"] is False
        assert "needs more confirmations" in result["error"]

    @patch('services.ethereum_service.EthereumService.is_connected')
    def test_verify_transaction_success(self, mock_is_connected):
        """Test successful transaction verification."""
        mock_is_connected.return_value = True

        service = EthereumService()
        service.w3 = Mock()
        service.payment_address = "0x0146311bdb312198b64c905fc249a35770dd9193"

        # Mock transaction
        mock_tx = {
            "value": 1600000000000000,  # 0.0016 ETH in wei
            "to": "0x0146311bdb312198b64c905fc249a35770dd9193",
            "from": "0xabcdef1234567890abcdef1234567890abcdef12"
        }
        service.w3.eth.get_transaction.return_value = mock_tx

        # Mock receipt with confirmations
        mock_receipt = Mock()
        mock_receipt.status = 1
        mock_receipt.blockNumber = 1000
        mock_receipt.gasUsed = 21000
        service.w3.eth.get_transaction_receipt.return_value = mock_receipt
        service.w3.eth.block_number = 1005

        result = service.verify_transaction(
            "0x1234567890abcdef",
            Decimal("0.0016"),
            "0xabcdef1234567890abcdef1234567890abcdef12"
        )

        assert result["verified"] is True
        assert result["details"]["transaction_hash"] == "0x1234567890abcdef"
        assert result["details"]["from"] == "0xabcdef1234567890abcdef1234567890abcdef12"
        assert result["details"]["to"] == "0x0146311bdb312198b64c905fc249a35770dd9193"
        assert result["details"]["amount_eth"] == "0.0016"
        assert result["details"]["confirmations"] == 5

    @patch('services.ethereum_service.EthereumService.is_connected')
    def test_verify_transaction_exception(self, mock_is_connected):
        """Test transaction verification when exception occurs."""
        mock_is_connected.return_value = True

        service = EthereumService()
        service.w3 = Mock()
        service.w3.eth.get_transaction.side_effect = Exception("Network error")

        result = service.verify_transaction(
            "0x1234567890abcdef",
            Decimal("0.0016"),
            "0xabcdef1234567890abcdef1234567890abcdef12"
        )

        assert result["verified"] is False
        assert "Transaction verification failed" in result["error"]

    def test_process_ethereum_payment_invalid_variant(self, db_session):
        """Test payment processing with invalid product variant."""
        service = EthereumService()
        user = UserFactory.create(db=db_session)

        result = service.process_ethereum_payment(
            db_session,
            user,
            "0x1234567890abcdef",
            "invalid_variant",
            "0.0016",
            "0xabcdef1234567890abcdef1234567890abcdef12"
        )

        assert result["success"] is False
        assert result["turns_added"] == 0
        assert "Invalid product variant" in result["message"]

    @patch('services.ethereum_service.EthereumService.verify_transaction')
    def test_process_ethereum_payment_verification_failed(self, mock_verify, db_session):
        """Test payment processing when transaction verification fails."""
        mock_verify.return_value = {
            "verified": False,
            "error": "Transaction not found",
            "details": {}
        }

        service = EthereumService()
        user = UserFactory.create(db=db_session)

        result = service.process_ethereum_payment(
            db_session,
            user,
            "0x1234567890abcdef",
            "10_turns",
            "0.0016",
            "0xabcdef1234567890abcdef1234567890abcdef12"
        )

        assert result["success"] is False
        assert result["transaction_verified"] is False
        assert result["turns_added"] == 0
        assert "Transaction verification failed" in result["message"]

    @patch('services.ethereum_service.EthereumService.verify_transaction')
    def test_process_ethereum_payment_duplicate_transaction(self, mock_verify, db_session):
        """Test payment processing when transaction is already processed."""
        # Setup mock verification
        mock_verify.return_value = {
            "verified": True,
            "details": {
                "transaction_hash": "0x1234567890abcdef",
                "amount_eth": "0.0016",
                "block_number": 1000
            }
        }

        service = EthereumService()
        user = UserFactory.create(db=db_session)

        # Create existing transaction record
        existing_tx = EthereumTransaction(
            transaction_hash="0x1234567890abcdef",
            user_id=user.id,
            wallet_address="0xabcdef1234567890abcdef1234567890abcdef12",
            eth_amount="0.0016",
            product_variant="10_turns",
            turns_added=10,
            block_number=1000,
            status="confirmed"
        )
        db_session.add(existing_tx)
        db_session.commit()

        result = service.process_ethereum_payment(
            db_session,
            user,
            "0x1234567890abcdef",
            "10_turns",
            "0.0016",
            "0xabcdef1234567890abcdef1234567890abcdef12"
        )

        assert result["success"] is False
        assert result["transaction_verified"] is True
        assert result["turns_added"] == 0
        assert "already been processed" in result["message"]

    @patch('services.ethereum_service.EthereumService.verify_transaction')
    def test_process_ethereum_payment_success(self, mock_verify, db_session):
        """Test successful payment processing."""
        # Setup mock verification
        mock_verify.return_value = {
            "verified": True,
            "details": {
                "transaction_hash": "0x1234567890abcdef",
                "amount_eth": "0.0016",
                "block_number": 1000,
                "gas_used": 21000
            }
        }

        service = EthereumService()
        user = UserFactory.create(db=db_session, number_of_paid_turns=5)

        result = service.process_ethereum_payment(
            db_session,
            user,
            "0x1234567890abcdef",
            "10_turns",
            "0.0016",
            "0xabcdef1234567890abcdef1234567890abcdef12"
        )

        assert result["success"] is True
        assert result["transaction_verified"] is True
        assert result["turns_added"] == 10
        assert "Payment successful" in result["message"]

        # Refresh user from database
        db_session.refresh(user)

        # Check that turns were added
        assert user.number_of_paid_turns == 15  # 5 + 10
        assert user.subscription_status == "active"

        # Check that transaction was recorded
        tx_record = db_session.query(EthereumTransaction).filter(
            EthereumTransaction.transaction_hash == "0x1234567890abcdef"
        ).first()

        assert tx_record is not None
        assert tx_record.user_id == user.id
        assert tx_record.eth_amount == "0.0016"
        assert tx_record.product_variant == "10_turns"
        assert tx_record.turns_added == 10
        assert tx_record.status == "confirmed"

    @patch('services.ethereum_service.EthereumService.verify_transaction')
    def test_process_ethereum_payment_database_error(self, mock_verify, db_session):
        """Test payment processing when database operation fails."""
        # Setup mock verification
        mock_verify.return_value = {
            "verified": True,
            "details": {
                "transaction_hash": "0x1234567890abcdef",
                "amount_eth": "0.0016",
                "block_number": 1000
            }
        }

        service = EthereumService()
        user = UserFactory.create(db=db_session)

        # Mock database commit to raise exception
        with patch.object(db_session, 'commit', side_effect=SQLAlchemyError("Database error")):
            result = service.process_ethereum_payment(
                db_session,
                user,
                "0x1234567890abcdef",
                "10_turns",
                "0.0016",
                "0xabcdef1234567890abcdef1234567890abcdef12"
            )

        assert result["success"] is False
        assert result["transaction_verified"] is False
        assert result["turns_added"] == 0
        assert "Payment processing failed" in result["message"]

    @patch('services.ethereum_service.EthereumService.verify_transaction')
    def test_process_ethereum_payment_unexpected_exception(self, mock_verify, db_session):
        """Test payment processing when unexpected exception occurs."""
        # Setup mock verification
        mock_verify.return_value = {
            "verified": True,
            "details": {
                "transaction_hash": "0x1234567890abcdef",
                "amount_eth": "0.0016",
                "block_number": 1000
            }
        }

        service = EthereumService()
        user = UserFactory.create(db=db_session)

        # Mock an unexpected exception
        with patch.object(user, 'add_paid_turns', side_effect=Exception("Unexpected error")):
            result = service.process_ethereum_payment(
                db_session,
                user,
                "0x1234567890abcdef",
                "10_turns",
                "0.0016",
                "0xabcdef1234567890abcdef1234567890abcdef12"
            )

        assert result["success"] is False
        assert result["transaction_verified"] is False
        assert result["turns_added"] == 0
        assert "Payment processing failed" in result["message"]
