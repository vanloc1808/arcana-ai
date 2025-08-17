import logging
from decimal import Decimal

from sqlalchemy.orm import Session
from web3 import Web3

from config import settings
from models import EthereumTransaction, User

logger = logging.getLogger(__name__)


class EthereumService:
    """Service for handling Ethereum blockchain interactions and payment verification."""

    def __init__(self):
        """Initialize the Ethereum service with Web3 connection."""
        # Use a reliable Ethereum RPC endpoint (you should set this in your environment)
        self.rpc_url = getattr(
            settings,
            "ETHEREUM_RPC_URL",
            "https://eth-mainnet.g.alchemy.com/v2/your-api-key",
        )
        self.payment_address = getattr(
            settings, "ETHEREUM_PAYMENT_ADDRESS", "0x0146311BDb312198b64c905fc249a35770Dd9193"
        ).lower()

        try:
            self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
            if not self.w3.is_connected():
                logger.error("Failed to connect to Ethereum network")
                self.w3 = None
        except Exception as e:
            logger.error(f"Failed to initialize Web3: {e}")
            self.w3 = None

    def is_connected(self) -> bool:
        """Check if Web3 is connected to the network."""
        return self.w3 is not None and self.w3.is_connected()

    def get_expected_eth_amount(self, product_variant: str) -> Decimal:
        """Get the expected ETH amount for a product variant.

        Args:
            product_variant: The product variant ('10_turns' or '20_turns')

        Returns:
            Expected ETH amount as Decimal
        """
        amounts = {
            "10_turns": Decimal("0.0016"),  # $3.99 -> ETH 0.0016
            "20_turns": Decimal("0.0024"),  # $5.99 -> ETH 0.0024
        }
        return amounts.get(product_variant, Decimal("0"))

    def get_turns_for_variant(self, product_variant: str) -> int:
        """Get the number of turns for a product variant.

        Args:
            product_variant: The product variant ('10_turns' or '20_turns')

        Returns:
            Number of turns to add
        """
        turns = {
            "10_turns": 10,
            "20_turns": 20,
        }
        return turns.get(product_variant, 0)

    def verify_transaction(
        self, transaction_hash: str, expected_amount: Decimal, sender_address: str
    ) -> dict[str, any]:
        """Verify an Ethereum transaction.

        Args:
            transaction_hash: The transaction hash to verify
            expected_amount: Expected ETH amount
            sender_address: Expected sender address

        Returns:
            Dictionary with verification results
        """
        if not self.is_connected():
            return {"verified": False, "error": "Unable to connect to Ethereum network", "details": {}}

        try:
            # Get transaction details
            tx = self.w3.eth.get_transaction(transaction_hash)
            if not tx:
                return {"verified": False, "error": "Transaction not found", "details": {}}

            # Get transaction receipt to check if it was successful
            receipt = self.w3.eth.get_transaction_receipt(transaction_hash)
            if not receipt or receipt.status != 1:
                return {
                    "verified": False,
                    "error": "Transaction failed or not confirmed",
                    "details": {"status": receipt.status if receipt else None},
                }

            # Verify transaction details
            tx_amount = Web3.from_wei(tx["value"], "ether")
            tx_to = tx["to"].lower() if tx["to"] else None
            tx_from = tx["from"].lower() if tx["from"] else None

            # Check if transaction is to our payment address
            if tx_to != self.payment_address:
                return {
                    "verified": False,
                    "error": f"Transaction not sent to payment address. Expected: {self.payment_address}, Got: {tx_to}",
                    "details": {"expected_to": self.payment_address, "actual_to": tx_to},
                }

            # Check if transaction is from the expected sender
            if tx_from != sender_address.lower():
                return {
                    "verified": False,
                    "error": f"Transaction not from expected sender. Expected: {sender_address.lower()}, Got: {tx_from}",
                    "details": {"expected_from": sender_address.lower(), "actual_from": tx_from},
                }

            # Check if amount is correct (allow small variance for gas fees)
            amount_difference = abs(Decimal(str(tx_amount)) - expected_amount)
            max_variance = Decimal("0.0001")  # Allow 0.0001 ETH variance

            if amount_difference > max_variance:
                return {
                    "verified": False,
                    "error": f"Incorrect payment amount. Expected: {expected_amount} ETH, Got: {tx_amount} ETH",
                    "details": {
                        "expected_amount": str(expected_amount),
                        "actual_amount": str(tx_amount),
                        "difference": str(amount_difference),
                    },
                }

            # Check if transaction has enough confirmations
            current_block = self.w3.eth.block_number
            confirmations = current_block - receipt.blockNumber
            min_confirmations = 1  # Minimum 1 confirmation

            if confirmations < min_confirmations:
                return {
                    "verified": False,
                    "error": f"Transaction needs more confirmations. Current: {confirmations}, Required: {min_confirmations}",
                    "details": {"confirmations": confirmations, "required": min_confirmations},
                }

            # Transaction is verified
            return {
                "verified": True,
                "details": {
                    "transaction_hash": transaction_hash,
                    "from": tx_from,
                    "to": tx_to,
                    "amount_eth": str(tx_amount),
                    "block_number": receipt.blockNumber,
                    "confirmations": confirmations,
                    "gas_used": receipt.gasUsed,
                },
            }

        except Exception as e:
            logger.error(f"Error verifying transaction {transaction_hash}: {e}")
            return {"verified": False, "error": f"Transaction verification failed: {str(e)}", "details": {}}

    def process_ethereum_payment(
        self, db: Session, user: User, transaction_hash: str, product_variant: str, eth_amount: str, wallet_address: str
    ) -> dict[str, any]:
        """Process an Ethereum payment by verifying the transaction and adding turns.

        Args:
            db: Database session
            user: User making the payment
            transaction_hash: Ethereum transaction hash
            product_variant: Product variant ('10_turns' or '20_turns')
            eth_amount: Amount of ETH claimed to be sent
            wallet_address: Sender's wallet address

        Returns:
            Dictionary with processing results
        """
        try:
            # Get expected amount and turns
            expected_amount = self.get_expected_eth_amount(product_variant)
            turns_to_add = self.get_turns_for_variant(product_variant)

            if expected_amount == 0 or turns_to_add == 0:
                return {
                    "success": False,
                    "transaction_verified": False,
                    "turns_added": 0,
                    "message": "Invalid product variant",
                    "transaction_hash": transaction_hash,
                }

            # Verify the transaction
            verification_result = self.verify_transaction(transaction_hash, expected_amount, wallet_address)

            if not verification_result["verified"]:
                return {
                    "success": False,
                    "transaction_verified": False,
                    "turns_added": 0,
                    "message": f"Transaction verification failed: {verification_result['error']}",
                    "transaction_hash": transaction_hash,
                }

            # Check if this transaction has already been processed
            existing_tx = (
                db.query(EthereumTransaction).filter(EthereumTransaction.transaction_hash == transaction_hash).first()
            )

            if existing_tx:
                return {
                    "success": False,
                    "transaction_verified": True,  # Transaction is valid but already processed
                    "turns_added": 0,
                    "message": f"Transaction {transaction_hash} has already been processed",
                    "transaction_hash": transaction_hash,
                }

            # Record the transaction to prevent double-spending
            eth_tx_record = EthereumTransaction(
                transaction_hash=transaction_hash,
                user_id=user.id,
                wallet_address=wallet_address,
                eth_amount=str(verification_result["details"]["amount_eth"]),
                product_variant=product_variant,
                turns_added=turns_to_add,
                block_number=verification_result["details"]["block_number"],
                status="confirmed",
            )
            db.add(eth_tx_record)

            # Add turns to user account
            user.add_paid_turns(turns_to_add)
            user.subscription_status = "active"  # Set subscription as active

            # Commit the changes
            db.commit()
            db.refresh(user)

            logger.info(
                f"Successfully processed Ethereum payment for user {user.id}: "
                f"tx_hash={transaction_hash}, variant={product_variant}, turns_added={turns_to_add}"
            )

            return {
                "success": True,
                "transaction_verified": True,
                "turns_added": turns_to_add,
                "message": f"Payment successful! {turns_to_add} turns added to your account.",
                "transaction_hash": transaction_hash,
            }

        except Exception as e:
            logger.error(f"Error processing Ethereum payment for user {user.id}: {e}")
            db.rollback()
            return {
                "success": False,
                "transaction_verified": False,
                "turns_added": 0,
                "message": f"Payment processing failed: {str(e)}",
                "transaction_hash": transaction_hash,
            }
