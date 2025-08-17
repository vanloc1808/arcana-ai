import hashlib
import hmac
import logging
from datetime import UTC, datetime

import httpx
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import User, SubscriptionEvent, PaymentTransaction, TurnUsageHistory, CheckoutSession
from schemas import TurnConsumptionResult

logger = logging.getLogger(__name__)


class SubscriptionService:
    """Service for handling Lemon Squeezy subscriptions and turn management."""

    def __init__(self):
        self.api_key = settings.LEMON_SQUEEZY_API_KEY
        self.store_id = settings.LEMON_SQUEEZY_STORE_ID
        self.webhook_secret = settings.LEMON_SQUEEZY_WEBHOOK_SECRET
        self.product_id_10_turns = settings.LEMON_SQUEEZY_PRODUCT_ID_10_TURNS
        self.product_id_20_turns = settings.LEMON_SQUEEZY_PRODUCT_ID_20_TURNS
        self.enable_test_mode = settings.LEMON_SQUEEZY_ENABLE_TEST_MODE
        self.base_url = "https://api.lemonsqueezy.com/v1"

    def _get_headers(self) -> dict[str, str]:
        """Get headers for Lemon Squeezy API requests."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
        }

    async def create_checkout_url(self, user: User, product_variant: str, db: Session) -> str:
        """Create a checkout URL for the user.

        Args:
            user (User): The user purchasing the subscription.
            product_variant (str): The product variant ('10_turns' or '20_turns').
            db (Session): Database session for storing checkout mapping.

        Returns:
            str: The checkout URL.

        Raises:
            ValueError: If the product variant is invalid.
            Exception: If the API request fails.
        """
        logger.info(f"Creating checkout URL for user {user.id} with variant {product_variant}")

        # Validate configuration
        if not self.api_key:
            logger.error("Lemon Squeezy API key is not configured")
            raise Exception("Lemon Squeezy API key is not configured")

        if not self.store_id:
            logger.error("Lemon Squeezy store ID is not configured")
            raise Exception("Lemon Squeezy store ID is not configured")

        if product_variant == "10_turns":
            product_id = self.product_id_10_turns
        elif product_variant == "20_turns":
            product_id = self.product_id_20_turns
        else:
            logger.error(f"Invalid product variant: {product_variant}")
            raise ValueError("Invalid product variant")

        if not product_id:
            logger.error(f"Product ID not configured for variant: {product_variant}")
            raise Exception(f"Product ID not configured for variant: {product_variant}")

        # Note: Custom attributes are not included in the checkout data because
        # Lemon Squeezy API returns a 400 error with custom fields in the current format.
        # User tracking will be handled through webhook events using the customer email/ID.
        checkout_data = {
            "data": {
                "type": "checkouts",
                "relationships": {
                    "store": {"data": {"type": "stores", "id": self.store_id}},
                    "variant": {"data": {"type": "variants", "id": product_id}},
                },
            }
        }

        logger.info(f"Sending checkout request to Lemon Squeezy with store_id: {self.store_id}, product_id: {product_id}")

        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/checkouts", headers=self._get_headers(), json=checkout_data)

            logger.info(f"Lemon Squeezy API response status: {response.status_code}")

            if response.status_code != 201:
                error_details = response.text
                logger.error(f"Lemon Squeezy API error: Status {response.status_code}, Response: {error_details}")
                raise Exception(f"Lemon Squeezy API error (status {response.status_code}): {error_details}")

            checkout_response = response.json()
            checkout_url = checkout_response["data"]["attributes"]["url"]
            checkout_id = checkout_response["data"]["id"]

            # Log the full response to see what data is available
            logger.info(f"Full Lemon Squeezy checkout response: {checkout_response}")

            # Store checkout session mapping
            from datetime import timedelta
            checkout_session = CheckoutSession(
                user_id=user.id,
                checkout_id=checkout_id,
                checkout_url=checkout_url,
                product_variant=product_variant,
                status="pending",
                user_email=user.email,  # Store user email for webhook matching
                expires_at=datetime.now(UTC) + timedelta(hours=24),  # Checkout expires in 24 hours
            )
            db.add(checkout_session)
            db.commit()

            logger.info(f"Successfully created checkout URL for user {user.id}, checkout_id: {checkout_id}")
            return checkout_url

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify the webhook signature from Lemon Squeezy.

        Args:
            payload (bytes): The raw payload from the webhook.
            signature (str): The signature from the X-Signature header.

        Returns:
            bool: True if the signature is valid, False otherwise.
        """
        if not self.webhook_secret:
            return False

        expected_signature = hmac.new(self.webhook_secret.encode(), payload, hashlib.sha256).hexdigest()

        return hmac.compare_digest(signature, expected_signature)

    def process_webhook_event(self, db: Session, event_data: dict) -> None:
        """Process a webhook event from Lemon Squeezy.

        Args:
            db (Session): Database session.
            event_data (Dict): The webhook event data.
        """
        event_name = event_data.get("meta", {}).get("event_name")
        data = event_data.get("data", {})
        attributes = data.get("attributes", {})
        custom_data = attributes.get("custom", {})
        meta = event_data.get("meta", {})
        is_test_mode = meta.get("test_mode", False)

        logger.info(f"Processing webhook event: {event_name}, test_mode: {is_test_mode}")

        # Check if test mode is enabled or if this is a production webhook
        if is_test_mode and not self.enable_test_mode:
            logger.info(f"Ignoring test mode webhook event {event_name} - test mode not enabled")
            return

        # Try to get user_id from custom data first (for legacy/subscription events)
        user_id = custom_data.get("user_id")
        user = None
        checkout_session = None

        if user_id:
            user = db.query(User).filter(User.id == int(user_id)).first()
            logger.info(f"Found user by user_id: {user.id if user else 'None'}")

        # For order events, try to find user by checkout session
        if not user and event_name == "order_created":
            # Extract checkout information to find the matching checkout session
            customer_id = attributes.get("customer_id")
            order_id = data.get("id")
            # Extract email from webhook payload
            user_email = attributes.get("user_email")

            logger.info(f"Looking for checkout session for order {order_id}, customer_id: {customer_id}, email: {user_email}")

            # Try to find a pending checkout session for this customer
            # We'll match based on recent pending sessions since we can't directly link order to checkout
            if customer_id or user_email:
                # Look for recent pending checkout sessions
                from datetime import timedelta
                recent_threshold = datetime.now(UTC) - timedelta(hours=24)

                checkout_sessions = db.query(CheckoutSession).filter(
                    CheckoutSession.status == "pending",
                    CheckoutSession.created_at >= recent_threshold
                ).order_by(CheckoutSession.created_at.desc()).all()

                logger.info(f"Found {len(checkout_sessions)} recent pending checkout sessions")

                for session in checkout_sessions:
                    session_user = db.query(User).filter(User.id == session.user_id).first()
                    if session_user:
                        logger.info(f"Checking session {session.id} for user {session_user.id} (email: {session_user.email}, stored_email: {session.user_email}, customer_id: {session_user.lemon_squeezy_customer_id})")

                        # Match by customer_id if user has it set
                        if customer_id and session_user.lemon_squeezy_customer_id == str(customer_id):
                            user = session_user
                            checkout_session = session
                            logger.info(f"Found user {user.id} via checkout session {session.id} using customer_id")
                            break
                        # Match by email (check both current user email and stored email)
                        elif user_email and (session_user.email == user_email or session.user_email == user_email):
                            user = session_user
                            checkout_session = session
                            logger.info(f"Found user {user.id} via checkout session {session.id} using email match")
                            break
                    else:
                        logger.warning(f"Checkout session {session.id} has invalid user_id: {session.user_id}")

                # Additional fallback: try to find user directly by email (even without pending session)
                if not user and user_email:
                    user = db.query(User).filter(User.email == user_email).first()
                    if user:
                        logger.info(f"Found user {user.id} directly by email {user_email} (no checkout session)")
                    else:
                        logger.info(f"No user found with email {user_email}")

                # For test mode, provide more detailed debugging
                if not user and is_test_mode:
                    logger.info(f"Test mode debugging - webhook payload: {event_data}")

                    # Check if this is a legitimate test scenario
                    if user_email == "you@example.com":
                        logger.info("Detected Lemon Squeezy test webhook with placeholder email")

                        # In test mode, find any recent pending checkout session as fallback
                        if checkout_sessions:
                            latest_session = checkout_sessions[0]
                            session_user = db.query(User).filter(User.id == latest_session.user_id).first()
                            if session_user:
                                logger.info(f"Test mode: Using latest pending checkout session {latest_session.id} for user {session_user.id}")
                                user = session_user
                                checkout_session = latest_session

        # If still no user found, try legacy lookup by customer_id
        if not user:
            customer_id = attributes.get("customer_id")
            if customer_id:
                user = db.query(User).filter(User.lemon_squeezy_customer_id == str(customer_id)).first()
                logger.info(f"Found user by customer_id {customer_id}: {user.id if user else 'None'}")

        if not user:
            customer_id = attributes.get('customer_id')
            order_id = data.get('id')
            user_email = attributes.get("user_email")

            # Count total users and recent checkout sessions for context
            from datetime import timedelta
            total_users = db.query(User).count()
            recent_checkout_count = db.query(CheckoutSession).filter(
                CheckoutSession.status == "pending",
                CheckoutSession.created_at >= datetime.now(UTC) - timedelta(hours=24)
            ).count()

            logger.warning(
                f"No user found for webhook event {event_name}. "
                f"Details: customer_id={customer_id}, order_id={order_id}, email={user_email}, "
                f"test_mode={is_test_mode}. "
                f"Database context: {total_users} total users, {recent_checkout_count} recent pending checkouts."
            )
            return

        # Mark checkout session as completed if found
        if checkout_session:
            checkout_session.status = "completed"
            # Store the customer_id in the checkout session for future reference
            if customer_id:
                checkout_session.customer_id = str(customer_id)
            db.add(checkout_session)

        # Store previous subscription status for comparison
        previous_status = user.subscription_status

        # Process the specific event
        turns_affected = 0
        if event_name in ["subscription_created", "subscription_updated"]:
            turns_affected = self._handle_subscription_created_updated(user, attributes, custom_data, db)
        elif event_name == "subscription_cancelled":
            self._handle_subscription_cancelled(user, attributes)
        elif event_name == "subscription_resumed":
            turns_affected = self._handle_subscription_resumed(user, attributes, custom_data)
        elif event_name == "order_created":
            # Pass checkout_session to get product_variant if available
            turns_affected = self._handle_order_created(user, attributes, data, db, checkout_session)

        # Log the subscription event for history tracking
        self.log_subscription_event(
            db=db,
            user=user,
            event_type=event_name,
            event_source="lemon_squeezy",
            subscription_status=user.subscription_status,
            turns_affected=turns_affected,
            external_id=data.get("id"),
            event_data=event_data,
            created_at=datetime.fromisoformat(attributes.get("created_at", datetime.now(UTC).isoformat())),
        )

        # Update sync timestamp
        user.last_subscription_sync = datetime.now(UTC)
        db.commit()

    def _handle_subscription_created_updated(self, user: User, attributes: dict, custom_data: dict, db: Session) -> int:
        """Handle subscription created/updated events.

        Args:
            user (User): The user object.
            attributes (dict): Webhook attributes.
            custom_data (dict): Custom data from webhook.
            db (Session): Database session for logging payment transaction.

        Returns:
            int: Number of turns added to user account.
        """
        user.lemon_squeezy_customer_id = attributes.get("customer_id")
        user.subscription_status = "active"

        # Add paid turns based on product variant
        product_variant = custom_data.get("product_variant")
        turns_added = 0

        if product_variant == "10_turns":
            turns_added = 10
            user.add_paid_turns(turns_added)
        elif product_variant == "20_turns":
            turns_added = 20
            user.add_paid_turns(turns_added)

        # Log payment transaction if turns were added
        if turns_added > 0:
            product_info = self.get_product_info(product_variant)
            price = product_info.get("price", "0")

            self.create_payment_transaction(
                db=db,
                user=user,
                transaction_type="purchase",
                payment_method="lemon_squeezy",
                external_transaction_id=attributes.get("order_id", "unknown"),
                amount=price.replace("$", ""),  # Remove $ sign for storage
                currency="USD",
                product_variant=product_variant,
                turns_purchased=turns_added,
                status="completed",
                metadata={
                    "customer_id": attributes.get("customer_id"),
                    "subscription_id": attributes.get("id"),
                    "webhook_data": custom_data,
                },
            )

        return turns_added

    def _handle_order_created(self, user: User, attributes: dict, data: dict, db: Session, checkout_session: CheckoutSession = None) -> int:
        """Handle order created events for one-time purchases.

        Args:
            user (User): The user object.
            attributes (dict): Webhook attributes.
            data (dict): Webhook data.
            db (Session): Database session for logging payment transaction.
            checkout_session (CheckoutSession): The checkout session associated with the order.

        Returns:
            int: Number of turns added to user account.
        """
        logger.info(f"Processing order_created for user {user.id}")

        # Update customer_id if not already set
        customer_id = attributes.get("customer_id")
        if customer_id and not user.lemon_squeezy_customer_id:
            user.lemon_squeezy_customer_id = str(customer_id)

        # Get product variant from checkout session if available, otherwise parse from product name
        product_variant = None
        turns_added = 0

        if checkout_session:
            product_variant = checkout_session.product_variant
            logger.info(f"Using product_variant from checkout session: {product_variant}")
        else:
            # Fallback: Extract product information from the order
            first_order_item = attributes.get("first_order_item", {})
            product_name = first_order_item.get("product_name", "")
            logger.info(f"Parsing product_variant from product_name: {product_name}")

            if "10" in product_name and "Turn" in product_name:
                product_variant = "10_turns"
            elif "20" in product_name and "Turn" in product_name:
                product_variant = "20_turns"

        # Determine turns based on product variant
        if product_variant == "10_turns":
            turns_added = 10
        elif product_variant == "20_turns":
            turns_added = 20
        else:
            logger.warning(f"Unknown product variant for order: {product_variant}")
            return 0

        # Add turns to user account
        user.add_paid_turns(turns_added)
        logger.info(f"Added {turns_added} turns to user {user.id}")

        # Log payment transaction
        if turns_added > 0 and product_variant:
            product_info = self.get_product_info(product_variant)

            # Get order amount from webhook, convert from cents to dollars
            total_amount = attributes.get("total", 0)
            amount_dollars = f"{total_amount / 100:.2f}" if total_amount else "0.00"

            # Get product name for metadata
            first_order_item = attributes.get("first_order_item", {})
            product_name = first_order_item.get("product_name", product_variant)

            self.create_payment_transaction(
                db=db,
                user=user,
                transaction_type="purchase",
                payment_method="lemon_squeezy",
                external_transaction_id=str(data.get("id", "unknown")),
                amount=amount_dollars,
                currency=attributes.get("currency", "USD"),
                product_variant=product_variant,
                turns_purchased=turns_added,
                status="completed",
                metadata={
                    "customer_id": customer_id,
                    "order_id": data.get("id"),
                    "product_name": product_name,
                    "order_number": attributes.get("order_number"),
                    "checkout_session_id": checkout_session.id if checkout_session else None,
                },
            )

        return turns_added

    def _handle_subscription_cancelled(self, user: User, attributes: dict) -> None:
        """Handle subscription cancelled events."""
        user.subscription_status = "cancelled"

    def _handle_subscription_resumed(self, user: User, attributes: dict, custom_data: dict) -> int:
        """Handle subscription resumed events.

        Args:
            user (User): The user object.
            attributes (dict): Webhook attributes.
            custom_data (dict): Custom data from webhook.

        Returns:
            int: Number of turns affected (0 for resume, just status change).
        """
        user.subscription_status = "active"
        return 0  # Resume doesn't add turns, just reactivates

    def consume_user_turn(self, db: Session, user: User, usage_context: str) -> TurnConsumptionResult:
        """Consume a turn for the user, prioritizing free turns first.

        Args:
            db (Session): Database session (for reference, but we'll create a separate one).
            user (User): The user consuming a turn.
            usage_context (str): Context where the turn is being consumed (e.g., 'reading', 'chat', 'subscription').

        Returns:
            TurnConsumptionResult: Result of the turn consumption.
        """
        allowed_contexts = {'reading', 'chat', 'subscription'}
        if usage_context not in allowed_contexts:
            usage_context = 'other'

        # Specialized premium users have unlimited turns
        if user.is_specialized_premium:
            # Log usage for specialized premium users too
            self.log_turn_usage(
                db=db,
                user=user,
                turn_type="unlimited",
                usage_context=usage_context,  # Use provided context
                turns_before=-1,  # Unlimited
                turns_after=-1,  # Still unlimited
                feature_used="specialized_premium_access",
                metadata={
                    "consumption_method": "specialized_premium",
                    "user_type": "specialized_premium",
                },
            )
            db.commit()

            return TurnConsumptionResult(
                success=True,
                remaining_free_turns=user.number_of_free_turns or 0,
                remaining_paid_turns=user.number_of_paid_turns or 0,
                total_remaining_turns=-1,  # Unlimited
                turn_type_consumed="unlimited",
                is_specialized_premium=True,
            )

        # Create a separate database session for turn consumption
        # This ensures the turn consumption is isolated from other transactions
        turn_db = next(get_db())
        try:
            # Get the user in this separate session
            turn_user = turn_db.query(User).filter(User.id == user.id).first()
            if not turn_user:
                return TurnConsumptionResult(
                    success=False,
                    remaining_free_turns=0,
                    remaining_paid_turns=0,
                    total_remaining_turns=0,
                    turn_type_consumed=None,
                    is_specialized_premium=False,
                )

            # Check if free turns should be reset
            if turn_user.should_reset_free_turns():
                turn_user.reset_free_turns()

            # Try to consume a turn
            success = turn_user.consume_turn()

            if success:
                # Determine which type of turn was consumed
                turn_type = "free" if turn_user.number_of_free_turns < 3 else "paid"

                # Log turn usage for history tracking
                self.log_turn_usage(
                    db=turn_db,
                    user=turn_user,
                    turn_type=turn_type,
                    usage_context=usage_context,  # Use provided context
                    turns_before=turn_user.get_total_turns() + 1,  # Before consumption
                    turns_after=turn_user.get_total_turns(),  # After consumption
                    feature_used="turn_consumption",
                    metadata={
                        "consumption_method": "subscription_service",
                        "free_turns_before": (turn_user.number_of_free_turns or 0) + (1 if turn_type == "free" else 0),
                        "paid_turns_before": (turn_user.number_of_paid_turns or 0) + (1 if turn_type == "paid" else 0),
                        "free_turns_after": turn_user.number_of_free_turns or 0,
                        "paid_turns_after": turn_user.number_of_paid_turns or 0,
                    },
                )

                # Commit the turn consumption and logging in the separate session
                turn_db.commit()

                # Update the original user object with the new turn counts
                # so the caller has the updated information
                user.number_of_free_turns = turn_user.number_of_free_turns
                user.number_of_paid_turns = turn_user.number_of_paid_turns
                user.last_free_turns_reset = turn_user.last_free_turns_reset

                return TurnConsumptionResult(
                    success=True,
                    remaining_free_turns=turn_user.number_of_free_turns or 0,
                    remaining_paid_turns=turn_user.number_of_paid_turns or 0,
                    total_remaining_turns=turn_user.get_total_turns(),
                    turn_type_consumed=turn_type,
                    is_specialized_premium=False,
                )
            else:
                return TurnConsumptionResult(
                    success=False,
                    remaining_free_turns=turn_user.number_of_free_turns or 0,
                    remaining_paid_turns=turn_user.number_of_paid_turns or 0,
                    total_remaining_turns=turn_user.get_total_turns(),
                    turn_type_consumed=None,
                    is_specialized_premium=False,
                )

        except Exception:
            # If there's any error, rollback the turn consumption session
            turn_db.rollback()
            return TurnConsumptionResult(
                success=False,
                remaining_free_turns=user.number_of_free_turns or 0,
                remaining_paid_turns=user.number_of_paid_turns or 0,
                total_remaining_turns=user.get_total_turns(),
                turn_type_consumed=None,
                is_specialized_premium=False,
            )
        finally:
            # Always close the separate session
            turn_db.close()

    def check_and_reset_free_turns(self, db: Session, user: User) -> bool:
        """Check if the user's free turns should be reset and reset them if needed.

        Args:
            db (Session): Database session.
            user (User): The user to check.

        Returns:
            bool: True if turns were reset, False otherwise.
        """
        if user.should_reset_free_turns():
            user.reset_free_turns()
            db.commit()
            return True
        return False

    def get_product_info(self, product_variant: str) -> dict[str, str]:
        """Get product information for display.

        Args:
            product_variant (str): The product variant.

        Returns:
            Dict[str, str]: Product information.
        """
        products = {
            "10_turns": {
                "name": "10 Drawing Turns",
                "price": "$3.99",
                "description": "10 additional tarot card drawing turns",
            },
            "20_turns": {
                "name": "20 Drawing Turns",
                "price": "$5.99",
                "description": "20 additional tarot card drawing turns",
            },
        }
        return products.get(product_variant, {})

    def log_subscription_event(
        self,
        db: Session,
        user: User,
        event_type: str,
        event_source: str,
        subscription_status: str,
        turns_affected: int = 0,
        external_id: str = None,
        event_data: dict = None,
        created_at: datetime = None,
    ) -> SubscriptionEvent:
        """Log a subscription event for tracking history.

        Args:
            db (Session): Database session.
            user (User): The user this event relates to.
            event_type (str): Type of event (created, updated, cancelled, etc.).
            event_source (str): Source of event (lemon_squeezy, ethereum, system).
            subscription_status (str): User's subscription status after this event.
            turns_affected (int): Number of turns affected by this event.
            external_id (str): External reference ID from payment processor.
            event_data (dict): Raw event data for debugging.
            created_at (datetime): When the event occurred (defaults to now).

        Returns:
            SubscriptionEvent: The created event record.
        """
        subscription_event = SubscriptionEvent(
            user_id=user.id,
            event_type=event_type,
            event_source=event_source,
            external_id=external_id,
            subscription_status=subscription_status,
            turns_affected=turns_affected,
            event_data=event_data or {},
            created_at=created_at or datetime.now(UTC),
        )

        db.add(subscription_event)
        return subscription_event

    def create_payment_transaction(
        self,
        db: Session,
        user: User,
        transaction_type: str,
        payment_method: str,
        external_transaction_id: str,
        amount: str,
        currency: str,
        product_variant: str,
        turns_purchased: int,
        status: str = "completed",
        processor_fee: str = None,
        net_amount: str = None,
        metadata: dict = None,
    ) -> PaymentTransaction:
        """Create a payment transaction record for history tracking.

        Args:
            db (Session): Database session.
            user (User): The user who made the payment.
            transaction_type (str): Type of transaction (purchase, refund, etc.).
            payment_method (str): Payment method (lemon_squeezy, ethereum).
            external_transaction_id (str): Transaction ID from processor.
            amount (str): Amount paid.
            currency (str): Currency code.
            product_variant (str): Product purchased.
            turns_purchased (int): Number of turns purchased.
            status (str): Transaction status.
            processor_fee (str): Fee charged by processor.
            net_amount (str): Net amount after fees.
            metadata (dict): Additional transaction metadata.

        Returns:
            PaymentTransaction: The created transaction record.
        """
        payment_transaction = PaymentTransaction(
            user_id=user.id,
            transaction_type=transaction_type,
            payment_method=payment_method,
            external_transaction_id=external_transaction_id,
            amount=amount,
            currency=currency,
            product_variant=product_variant,
            turns_purchased=turns_purchased,
            status=status,
            processor_fee=processor_fee,
            net_amount=net_amount,
            transaction_metadata=metadata or {},
            processed_at=datetime.now(UTC),
        )

        db.add(payment_transaction)
        return payment_transaction

    def log_turn_usage(
        self,
        db: Session,
        user: User,
        turn_type: str,
        usage_context: str,
        turns_before: int,
        turns_after: int,
        feature_used: str = None,
        session_id: str = None,
        metadata: dict = None,
    ) -> TurnUsageHistory:
        """Log turn usage for analytics and history tracking.

        Args:
            db (Session): Database session.
            user (User): The user who consumed the turn.
            turn_type (str): Type of turn (free, paid, unlimited).
            usage_context (str): Context (reading, chat).
            turns_before (int): Total turns before consumption.
            turns_after (int): Total turns after consumption.
            feature_used (str): Specific feature used.
            session_id (str): Session identifier.
            metadata (dict): Additional usage metadata.

        Returns:
            TurnUsageHistory: The created usage record.
        """
        turn_usage = TurnUsageHistory(
            user_id=user.id,
            turn_type=turn_type,
            usage_context=usage_context,
            turns_before=turns_before,
            turns_after=turns_after,
            feature_used=feature_used,
            session_id=session_id,
            usage_metadata=metadata or {},
        )

        db.add(turn_usage)
        return turn_usage
