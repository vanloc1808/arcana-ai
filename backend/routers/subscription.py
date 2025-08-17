import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta

from database import get_db
from models import User, SubscriptionEvent, PaymentTransaction, TurnUsageHistory, SubscriptionPlan, CheckoutSession
from routers.auth import get_current_user
from schemas import (
    CheckoutRequest,
    CheckoutResponse,
    EthereumPaymentRequest,
    EthereumPaymentResponse,
    SubscriptionResponse,
    TurnsResponse,
    SubscriptionEventResponse,
    PaymentTransactionResponse,
    TurnUsageHistoryResponse,
    SubscriptionPlanResponse,
    SubscriptionHistoryResponse,
)
from services.ethereum_service import EthereumService
from services.subscription_service import SubscriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["subscription"])
subscription_service = SubscriptionService()
ethereum_service = EthereumService()


@router.get("/user/turns", response_model=TurnsResponse)
async def get_user_turns(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the user's current turn counts and subscription status."""
    # Check and reset free turns if needed
    subscription_service.check_and_reset_free_turns(db, current_user)

    # Refresh user from database to get updated values
    db.refresh(current_user)

    return TurnsResponse(
        number_of_free_turns=current_user.number_of_free_turns or 0,
        number_of_paid_turns=current_user.number_of_paid_turns or 0,
        total_turns=current_user.get_total_turns(),
        subscription_status=current_user.subscription_status or "none",
        is_specialized_premium=current_user.is_specialized_premium or False,
        last_free_turns_reset=current_user.last_free_turns_reset,
    )


@router.get("/user/subscription", response_model=SubscriptionResponse)
async def get_user_subscription(current_user: User = Depends(get_current_user)):
    """Get the user's subscription information."""
    return SubscriptionResponse(
        subscription_status=current_user.subscription_status or "none",
        lemon_squeezy_customer_id=current_user.lemon_squeezy_customer_id,
        number_of_paid_turns=current_user.number_of_paid_turns or 0,
        last_subscription_sync=current_user.last_subscription_sync,
    )


@router.post("/subscription/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CheckoutRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Create a checkout session for purchasing turns."""
    try:
        logger.info(f"Creating checkout session for user {current_user.id} with product variant: {request.product_variant}")
        checkout_url = await subscription_service.create_checkout_url(current_user, request.product_variant, db)
        logger.info(f"Successfully created checkout session for user {current_user.id}")
        return CheckoutResponse(checkout_url=checkout_url)
    except ValueError as e:
        logger.warning(f"Invalid product variant for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create checkout session for user {current_user.id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
        )


@router.post("/webhooks/lemon-squeezy")
async def handle_lemon_squeezy_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle webhook events from Lemon Squeezy."""
    try:
        # Get the raw payload
        payload = await request.body()

        # Get the signature from headers
        signature = request.headers.get("x-signature")
        if not signature:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing signature")

        # Verify the webhook signature
        if not subscription_service.verify_webhook_signature(payload, signature):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")

        # Parse the JSON payload
        event_data = json.loads(payload)

        # Process the webhook event
        subscription_service.process_webhook_event(db, event_data)

        return {"status": "success"}

    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload")
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to process webhook")


@router.get("/subscription/products")
async def get_available_products():
    """Get the list of available subscription products."""
    return {
        "products": [
            {"variant": "10_turns", **subscription_service.get_product_info("10_turns")},
            {"variant": "20_turns", **subscription_service.get_product_info("20_turns")},
        ]
    }


@router.post("/user/consume-turn")
async def consume_turn(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Consume a turn for the current user."""
    result = subscription_service.consume_user_turn(db, current_user, usage_context='subscription')

    if not result.success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No turns available")

    return result


@router.post("/subscription/ethereum-payment", response_model=EthereumPaymentResponse)
async def process_ethereum_payment(
    request: EthereumPaymentRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Process an Ethereum payment for subscription turns with blockchain verification."""
    try:
        # Check if Ethereum service is available
        if not ethereum_service.is_connected():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Ethereum verification service is unavailable"
            )

        logger.info(f"Processing Ethereum payment: {request.transaction_hash} for user {current_user.id}")

        # Process the payment using the Ethereum service
        result = ethereum_service.process_ethereum_payment(
            db=db,
            user=current_user,
            transaction_hash=request.transaction_hash,
            product_variant=request.product_variant,
            eth_amount=request.eth_amount,
            wallet_address=request.wallet_address,
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("message", "Payment verification failed")
            )

        return EthereumPaymentResponse(
            success=result["success"],
            transaction_verified=result["transaction_verified"],
            turns_added=result["turns_added"],
            message=result["message"],
            transaction_hash=result["transaction_hash"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing Ethereum payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to process Ethereum payment"
        )


# --- Subscription History Endpoints ---


@router.get("/user/subscription/events", response_model=list[SubscriptionEventResponse])
async def get_user_subscription_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    """Get the user's subscription events history."""
    try:
        events = (
            db.query(SubscriptionEvent)
            .filter(SubscriptionEvent.user_id == current_user.id)
            .order_by(desc(SubscriptionEvent.created_at))
            .offset(offset)
            .limit(limit)
            .all()
        )

        return [SubscriptionEventResponse.model_validate(event) for event in events]

    except Exception as e:
        logger.error(f"Error retrieving subscription events for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve subscription events"
        )


@router.get("/user/subscription/transactions", response_model=list[PaymentTransactionResponse])
async def get_user_payment_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    """Get the user's payment transaction history."""
    try:
        transactions = (
            db.query(PaymentTransaction)
            .filter(PaymentTransaction.user_id == current_user.id)
            .order_by(desc(PaymentTransaction.created_at))
            .offset(offset)
            .limit(limit)
            .all()
        )

        return [PaymentTransactionResponse.model_validate(transaction) for transaction in transactions]

    except Exception as e:
        logger.error(f"Error retrieving payment transactions for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve payment transactions"
        )


@router.get("/user/subscription/turn-usage", response_model=list[TurnUsageHistoryResponse])
async def get_user_turn_usage_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 100,
    offset: int = 0,
    days: int = 30,
):
    """Get the user's turn usage history for the specified number of days."""
    try:
        # Calculate date threshold
        date_threshold = datetime.utcnow() - timedelta(days=days)

        usage_history = (
            db.query(TurnUsageHistory)
            .filter(
                TurnUsageHistory.user_id == current_user.id,
                TurnUsageHistory.consumed_at >= date_threshold,
            )
            .order_by(desc(TurnUsageHistory.consumed_at))
            .offset(offset)
            .limit(limit)
            .all()
        )

        return [TurnUsageHistoryResponse.model_validate(usage) for usage in usage_history]

    except Exception as e:
        logger.error(f"Error retrieving turn usage history for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve turn usage history"
        )


@router.get("/subscription/plans", response_model=list[SubscriptionPlanResponse])
async def get_subscription_plans(db: Session = Depends(get_db)):
    """Get all available subscription plans."""
    try:
        plans = (
            db.query(SubscriptionPlan)
            .filter(SubscriptionPlan.is_active == True)
            .order_by(SubscriptionPlan.sort_order, SubscriptionPlan.turns_included)
            .all()
        )

        return [SubscriptionPlanResponse.model_validate(plan) for plan in plans]

    except Exception as e:
        logger.error(f"Error retrieving subscription plans: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve subscription plans"
        )


@router.get("/user/subscription/history", response_model=SubscriptionHistoryResponse)
async def get_user_subscription_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    events_limit: int = 20,
    transactions_limit: int = 20,
    usage_limit: int = 50,
    usage_days: int = 30,
):
    """Get comprehensive subscription history for the user."""
    try:
        # Get subscription events
        events = (
            db.query(SubscriptionEvent)
            .filter(SubscriptionEvent.user_id == current_user.id)
            .order_by(desc(SubscriptionEvent.created_at))
            .limit(events_limit)
            .all()
        )

        # Get payment transactions
        transactions = (
            db.query(PaymentTransaction)
            .filter(PaymentTransaction.user_id == current_user.id)
            .order_by(desc(PaymentTransaction.created_at))
            .limit(transactions_limit)
            .all()
        )

        # Get turn usage history
        date_threshold = datetime.utcnow() - timedelta(days=usage_days)
        usage_history = (
            db.query(TurnUsageHistory)
            .filter(
                TurnUsageHistory.user_id == current_user.id,
                TurnUsageHistory.consumed_at >= date_threshold,
            )
            .order_by(desc(TurnUsageHistory.consumed_at))
            .limit(usage_limit)
            .all()
        )

        # Get subscription plans
        plans = (
            db.query(SubscriptionPlan)
            .filter(SubscriptionPlan.is_active == True)
            .order_by(SubscriptionPlan.sort_order, SubscriptionPlan.turns_included)
            .all()
        )

        # Calculate summary statistics
        total_spent = sum(
            float(transaction.amount) for transaction in transactions
            if transaction.status == "completed" and transaction.currency == "USD"
        )

        total_turns_purchased = sum(
            transaction.turns_purchased for transaction in transactions
            if transaction.status == "completed"
        )

        total_turns_used = len(usage_history)

        # Calculate usage by context
        usage_by_context = {}
        for usage in usage_history:
            context = usage.usage_context
            usage_by_context[context] = usage_by_context.get(context, 0) + 1

        summary = {
            "total_events": len(events),
            "total_transactions": len(transactions),
            "total_spent_usd": f"{total_spent:.2f}",
            "total_turns_purchased": total_turns_purchased,
            "total_turns_used_period": total_turns_used,
            "current_subscription_status": current_user.subscription_status or "none",
            "current_free_turns": current_user.number_of_free_turns or 0,
            "current_paid_turns": current_user.number_of_paid_turns or 0,
            "usage_by_context": usage_by_context,
            "is_specialized_premium": current_user.is_specialized_premium or False,
        }

        return SubscriptionHistoryResponse(
            subscription_events=[SubscriptionEventResponse.model_validate(event) for event in events],
            payment_transactions=[PaymentTransactionResponse.model_validate(transaction) for transaction in transactions],
            turn_usage_history=[TurnUsageHistoryResponse.model_validate(usage) for usage in usage_history],
            subscription_plans=[SubscriptionPlanResponse.model_validate(plan) for plan in plans],
            summary=summary,
        )

    except Exception as e:
        logger.error(f"Error retrieving subscription history for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve subscription history"
        )
