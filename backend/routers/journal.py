"""
Journal API Router

This module provides API endpoints for the Advanced Tarot Journal & Personal Growth feature.
It handles CRUD operations for journal entries, personal card meanings, analytics, and reminders.

Features:
- Journal entry management (create, read, update, delete)
- Personal card meanings management
- Analytics and insights generation
- Reminder system for follow-ups
- Comprehensive filtering and search capabilities
- Security measures for user data isolation

Dependencies:
- FastAPI for routing and dependency injection
- SQLAlchemy for database operations
- Custom authentication and validation
- Background task processing for analytics

Author: ArcanaAI Development Team
Version: 1.0.0
"""

import re
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy import asc, desc, func, or_
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Card, ReadingReminder, User, UserCardMeaning, UserReadingJournal
from routers.auth import get_current_user
from schemas import (
    JournalAnalytics,
    JournalEntryCreate,
    JournalEntryResponse,
    JournalEntryUpdate,
    PersonalCardMeaningCreate,
    PersonalCardMeaningResponse,
    PersonalCardMeaningUpdate,
    ReminderCreate,
    ReminderResponse,
)
from utils.rate_limiter import limiter

router = APIRouter(prefix="/api/journal", tags=["journal"])


# Utility function for HTML sanitization
def sanitize_html(text: str) -> str:
    """Basic HTML sanitization for user input."""
    if not text:
        return text

    # Simple sanitization - remove HTML tags
    clean = re.compile("<.*?>")
    return re.sub(clean, "", text)


# --- Journal Entry Endpoints ---


@router.post("/entries", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_journal_entry(
    request: Request,
    entry: JournalEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new journal entry.

    Creates a personal journal entry with reading data, notes, mood tracking,
    and optional follow-up reminders.

    Args:
        entry: Journal entry data
        current_user: Authenticated user
        db: Database session

    Returns:
        JournalEntryResponse: Created journal entry

    Raises:
        HTTPException: If creation fails or data is invalid
    """
    try:
        # Create journal entry
        # Sanitize personal notes
        sanitized_notes = sanitize_html(entry.personal_notes) if entry.personal_notes else None

        db_entry = UserReadingJournal(
            user_id=current_user.id,
            reading_id=entry.reading_id,
            reading_snapshot=entry.reading_snapshot,
            personal_notes=sanitized_notes,
            mood_before=entry.mood_before,
            mood_after=entry.mood_after,
            outcome_rating=entry.outcome_rating,
            follow_up_date=entry.follow_up_date,
            tags=entry.tags or [],
            is_favorite=entry.is_favorite,
        )

        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)

        # Create follow-up reminder if specified
        if entry.follow_up_date:
            reminder = ReadingReminder(
                user_id=current_user.id,
                journal_entry_id=db_entry.id,
                reminder_type="follow_up",
                reminder_date=entry.follow_up_date,
                message=f"Follow up on your reading from {db_entry.created_at.strftime('%B %d, %Y')}",
            )
            db.add(reminder)
            db.commit()

        return db_entry

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create journal entry: {str(e)}"
        )


@router.get("/entries", response_model=list[JournalEntryResponse])
@limiter.limit("30/minute")
async def get_journal_entries(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of entries to skip"),
    limit: int = Query(20, le=100, description="Maximum number of entries to return"),
    tags: Optional[str] = Query(None, description="Comma-separated tags to filter by"),
    favorite_only: bool = Query(False, description="Show only favorite entries"),
    start_date: Optional[date] = Query(None, description="Start date for filtering"),
    end_date: Optional[date] = Query(None, description="End date for filtering"),
    mood_min: Optional[int] = Query(None, ge=1, le=10, description="Minimum mood rating"),
    mood_max: Optional[int] = Query(None, ge=1, le=10, description="Maximum mood rating"),
    search_notes: Optional[str] = Query(None, description="Search in personal notes"),
    sort_by: Optional[str] = Query("created_at", description="Sort field"),
    sort_order: Optional[str] = Query("desc", description="Sort order (asc/desc)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get user's journal entries with filtering and pagination.

    Retrieves journal entries belonging to the current user with support for
    comprehensive filtering, searching, and sorting options.

    Args:
        skip: Number of entries to skip (pagination)
        limit: Maximum number of entries to return
        tags: Comma-separated tags to filter by
        favorite_only: Show only favorite entries
        start_date: Start date for filtering
        end_date: End date for filtering
        mood_min: Minimum mood rating filter
        mood_max: Maximum mood rating filter
        search_notes: Search term for personal notes
        sort_by: Field to sort by
        sort_order: Sort order (asc/desc)
        current_user: Authenticated user
        db: Database session

    Returns:
        List[JournalEntryResponse]: List of journal entries
    """
    try:
        # Build base query
        query = (
            db.query(UserReadingJournal)
            .options(joinedload(UserReadingJournal.shared_reading))
            .filter(UserReadingJournal.user_id == current_user.id)
        )

        # Apply filters
        if favorite_only:
            query = query.filter(UserReadingJournal.is_favorite.is_(True))

        if start_date:
            query = query.filter(UserReadingJournal.created_at >= start_date)

        if end_date:
            query = query.filter(UserReadingJournal.created_at <= end_date)

        if mood_min is not None:
            query = query.filter(
                or_(UserReadingJournal.mood_before >= mood_min, UserReadingJournal.mood_after >= mood_min)
            )

        if mood_max is not None:
            query = query.filter(
                or_(UserReadingJournal.mood_before <= mood_max, UserReadingJournal.mood_after <= mood_max)
            )

        if tags:
            tag_list = [tag.strip() for tag in tags.split(",")]
            for tag in tag_list:
                # Use JSON search for SQLite compatibility
                query = query.filter(func.json_extract(UserReadingJournal.tags, "$").like(f'%"{tag}"%'))

        if search_notes:
            query = query.filter(UserReadingJournal.personal_notes.ilike(f"%{search_notes}%"))

        # Apply sorting
        sort_field = getattr(UserReadingJournal, sort_by, UserReadingJournal.created_at)
        query = query.order_by(asc(sort_field)) if sort_order.lower() == "asc" else query.order_by(desc(sort_field))

        # Apply pagination
        entries = query.offset(skip).limit(limit).all()

        return entries

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to retrieve journal entries: {str(e)}"
        )


@router.get("/entries/{entry_id}", response_model=JournalEntryResponse)
@limiter.limit("60/minute")
async def get_journal_entry(
    request: Request, entry_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get a specific journal entry by ID.

    Args:
        entry_id: Journal entry ID
        current_user: Authenticated user
        db: Database session

    Returns:
        JournalEntryResponse: Journal entry details

    Raises:
        HTTPException: If entry not found or access denied
    """
    entry = (
        db.query(UserReadingJournal)
        .options(joinedload(UserReadingJournal.shared_reading))
        .filter(UserReadingJournal.id == entry_id, UserReadingJournal.user_id == current_user.id)
        .first()
    )

    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")

    return entry


@router.put("/entries/{entry_id}", response_model=JournalEntryResponse)
@limiter.limit("10/minute")
async def update_journal_entry(
    request: Request,
    entry_id: int,
    entry_update: JournalEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a journal entry.

    Args:
        entry_id: Journal entry ID
        entry_update: Updated entry data
        current_user: Authenticated user
        db: Database session

    Returns:
        JournalEntryResponse: Updated journal entry

    Raises:
        HTTPException: If entry not found or update fails
    """
    try:
        entry = (
            db.query(UserReadingJournal)
            .filter(UserReadingJournal.id == entry_id, UserReadingJournal.user_id == current_user.id)
            .first()
        )

        if not entry:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")

        # Update fields
        update_data = entry_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(entry, field, value)

        # Update timestamp
        entry.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(entry)

        return entry

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update journal entry: {str(e)}"
        )


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
async def delete_journal_entry(
    request: Request, entry_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Delete a journal entry.

    Args:
        entry_id: Journal entry ID
        current_user: Authenticated user
        db: Database session

    Returns:
        dict: Success message

    Raises:
        HTTPException: If entry not found or deletion fails
    """
    try:
        entry = (
            db.query(UserReadingJournal)
            .filter(UserReadingJournal.id == entry_id, UserReadingJournal.user_id == current_user.id)
            .first()
        )

        if not entry:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")

        db.delete(entry)
        db.commit()

        return {"message": "Journal entry deleted successfully"}

    except HTTPException:
        # Re-raise HTTP exceptions (like 404) without modification
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete journal entry: {str(e)}"
        )


# --- Personal Card Meanings Endpoints ---


@router.post("/card-meanings", response_model=PersonalCardMeaningResponse)
@limiter.limit("5/minute")
async def create_or_update_card_meaning(
    request: Request,
    response: Response,
    meaning: PersonalCardMeaningCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create or update a personal card meaning.

    Args:
        meaning: Card meaning data
        current_user: Authenticated user
        db: Database session

    Returns:
        PersonalCardMeaningResponse: Created or updated card meaning
    """
    try:
        # Check if card exists
        card = db.query(Card).filter(Card.id == meaning.card_id).first()
        if not card:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

        # Check if meaning already exists
        existing_meaning = (
            db.query(UserCardMeaning)
            .filter(UserCardMeaning.user_id == current_user.id, UserCardMeaning.card_id == meaning.card_id)
            .first()
        )

        if existing_meaning:
            # Update existing meaning
            existing_meaning.personal_meaning = meaning.personal_meaning
            existing_meaning.emotional_keywords = meaning.emotional_keywords or []
            existing_meaning.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing_meaning)
            response.status_code = status.HTTP_200_OK
            return existing_meaning
        else:
            # Create new meaning
            db_meaning = UserCardMeaning(
                user_id=current_user.id,
                card_id=meaning.card_id,
                personal_meaning=meaning.personal_meaning,
                emotional_keywords=meaning.emotional_keywords or [],
            )
            db.add(db_meaning)
            db.commit()
            db.refresh(db_meaning)
            response.status_code = status.HTTP_201_CREATED
            return db_meaning

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create/update card meaning: {str(e)}"
        )


@router.get("/card-meanings", response_model=list[PersonalCardMeaningResponse])
@limiter.limit("30/minute")
async def get_card_meanings(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get user's personal card meanings.

    Args:
        skip: Number of meanings to skip
        limit: Maximum number of meanings to return
        current_user: Authenticated user
        db: Database session

    Returns:
        List[PersonalCardMeaningResponse]: List of card meanings
    """
    meanings = (
        db.query(UserCardMeaning)
        .options(joinedload(UserCardMeaning.card))
        .filter(UserCardMeaning.user_id == current_user.id, UserCardMeaning.is_active.is_(True))
        .order_by(desc(UserCardMeaning.usage_count))
        .offset(skip)
        .limit(limit)
        .all()
    )

    return meanings


@router.get("/card-meanings/{card_id}", response_model=PersonalCardMeaningResponse)
@limiter.limit("60/minute")
async def get_card_meaning(
    request: Request, card_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get personal meaning for a specific card.

    Args:
        card_id: Card ID
        current_user: Authenticated user
        db: Database session

    Returns:
        PersonalCardMeaningResponse: Card meaning details

    Raises:
        HTTPException: If meaning not found
    """
    meaning = (
        db.query(UserCardMeaning)
        .options(joinedload(UserCardMeaning.card))
        .filter(
            UserCardMeaning.user_id == current_user.id,
            UserCardMeaning.card_id == card_id,
            UserCardMeaning.is_active.is_(True),
        )
        .first()
    )

    if not meaning:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personal card meaning not found")

    return meaning


@router.put("/card-meanings/{card_id}", response_model=PersonalCardMeaningResponse)
@limiter.limit("5/minute")
async def update_card_meaning(
    request: Request,
    card_id: int,
    meaning_update: PersonalCardMeaningUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a personal card meaning.

    Args:
        card_id: Card ID
        meaning_update: Updated meaning data
        current_user: Authenticated user
        db: Database session

    Returns:
        PersonalCardMeaningResponse: Updated card meaning
    """
    meaning = (
        db.query(UserCardMeaning)
        .filter(UserCardMeaning.user_id == current_user.id, UserCardMeaning.card_id == card_id)
        .first()
    )

    if not meaning:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personal card meaning not found")

    # Update fields
    if meaning_update.personal_meaning is not None:
        meaning.personal_meaning = meaning_update.personal_meaning
    if meaning_update.emotional_keywords is not None:
        meaning.emotional_keywords = meaning_update.emotional_keywords

    meaning.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(meaning)

    return meaning


@router.delete("/card-meanings/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
async def delete_card_meaning(
    request: Request, card_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Delete a personal card meaning.

    Args:
        card_id: Card ID
        current_user: Authenticated user
        db: Database session

    Returns:
        dict: Success message
    """
    meaning = (
        db.query(UserCardMeaning)
        .filter(UserCardMeaning.user_id == current_user.id, UserCardMeaning.card_id == card_id)
        .first()
    )

    if not meaning:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personal card meaning not found")

    db.delete(meaning)
    db.commit()

    return {"message": "Personal card meaning deleted successfully"}


# --- Analytics Endpoints ---


@router.get("/analytics/summary", response_model=JournalAnalytics)
@limiter.limit("10/minute")
async def get_journal_analytics(
    request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get comprehensive journal analytics for the user.

    Args:
        current_user: Authenticated user
        db: Database session

    Returns:
        JournalAnalytics: Analytics data including trends, patterns, and insights
    """
    try:
        # Get current date info
        now = datetime.utcnow()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Basic counts
        total_entries = db.query(UserReadingJournal).filter(UserReadingJournal.user_id == current_user.id).count()

        entries_this_month = (
            db.query(UserReadingJournal)
            .filter(UserReadingJournal.user_id == current_user.id, UserReadingJournal.created_at >= current_month_start)
            .count()
        )

        # Mood trends calculation
        mood_entries = (
            db.query(UserReadingJournal)
            .filter(
                UserReadingJournal.user_id == current_user.id,
                UserReadingJournal.mood_before.isnot(None),
                UserReadingJournal.mood_after.isnot(None),
            )
            .all()
        )

        mood_trends = {}
        average_mood_improvement = None

        if mood_entries:
            improvements = []
            monthly_moods = {}

            for entry in mood_entries:
                improvement = entry.mood_after - entry.mood_before
                improvements.append(improvement)

                month_key = entry.created_at.strftime("%Y-%m")
                if month_key not in monthly_moods:
                    monthly_moods[month_key] = {"before": [], "after": []}

                monthly_moods[month_key]["before"].append(entry.mood_before)
                monthly_moods[month_key]["after"].append(entry.mood_after)

            average_mood_improvement = sum(improvements) / len(improvements)

            # Calculate monthly averages
            mood_trends = {
                "monthly_averages": {
                    month: {
                        "before": sum(data["before"]) / len(data["before"]),
                        "after": sum(data["after"]) / len(data["after"]),
                        "improvement": (sum(data["after"]) - sum(data["before"])) / len(data["before"]),
                    }
                    for month, data in monthly_moods.items()
                },
                "overall_improvement": average_mood_improvement,
            }

        # Card frequency analysis
        card_usage = {}
        for entry in db.query(UserReadingJournal).filter(UserReadingJournal.user_id == current_user.id).all():
            reading_data = entry.get_reading_data()
            if isinstance(reading_data, dict) and "cards" in reading_data:
                for card_data in reading_data["cards"]:
                    card_name = card_data.get("name", "Unknown")
                    card_usage[card_name] = card_usage.get(card_name, 0) + 1

        favorite_cards = [
            {"name": name, "count": count}
            for name, count in sorted(card_usage.items(), key=lambda x: x[1], reverse=True)[:10]
        ]

        # Reading frequency by month
        reading_frequency = {}
        for entry in db.query(UserReadingJournal).filter(UserReadingJournal.user_id == current_user.id).all():
            month_key = entry.created_at.strftime("%Y-%m")
            reading_frequency[month_key] = reading_frequency.get(month_key, 0) + 1

        # Tag usage analysis
        tag_usage = {}
        for entry in (
            db.query(UserReadingJournal)
            .filter(UserReadingJournal.user_id == current_user.id, UserReadingJournal.tags.isnot(None))
            .all()
        ):
            for tag in entry.tags or []:
                tag_usage[tag] = tag_usage.get(tag, 0) + 1

        most_used_tags = [
            {"tag": tag, "count": count}
            for tag, count in sorted(tag_usage.items(), key=lambda x: x[1], reverse=True)[:10]
        ]

        # Follow-up completion rate
        follow_up_entries = (
            db.query(UserReadingJournal)
            .filter(UserReadingJournal.user_id == current_user.id, UserReadingJournal.follow_up_date.isnot(None))
            .all()
        )

        follow_up_completion_rate = None
        if follow_up_entries:
            completed = sum(1 for entry in follow_up_entries if entry.follow_up_completed)
            follow_up_completion_rate = completed / len(follow_up_entries)

        # Growth metrics
        growth_metrics = {
            "total_readings": total_entries,
            "monthly_consistency": entries_this_month,
            "introspection_depth": sum(
                1
                for entry in db.query(UserReadingJournal)
                .filter(UserReadingJournal.user_id == current_user.id, UserReadingJournal.personal_notes.isnot(None))
                .all()
            ),
            "mindfulness_practice": len(mood_entries),
            "commitment_level": follow_up_completion_rate or 0.0,
        }

        return JournalAnalytics(
            total_entries=total_entries,
            entries_this_month=entries_this_month,
            favorite_cards=favorite_cards,
            mood_trends=mood_trends,
            reading_frequency=reading_frequency,
            growth_metrics=growth_metrics,
            average_mood_improvement=average_mood_improvement,
            most_used_tags=most_used_tags,
            follow_up_completion_rate=follow_up_completion_rate,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate analytics: {str(e)}"
        )


@router.get("/analytics/mood-trends")
@limiter.limit("10/minute")
async def get_mood_trends(
    request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get mood trends analytics."""
    try:
        entries = (
            db.query(UserReadingJournal)
            .filter(
                UserReadingJournal.user_id == current_user.id,
                or_(UserReadingJournal.mood_before.isnot(None), UserReadingJournal.mood_after.isnot(None)),
            )
            .order_by(UserReadingJournal.created_at)
            .all()
        )

        mood_data = []
        for entry in entries:
            if entry.mood_before is not None or entry.mood_after is not None:
                mood_data.append(
                    {
                        "date": entry.created_at.date().isoformat(),
                        "mood_before": entry.mood_before,
                        "mood_after": entry.mood_after,
                        "improvement": (entry.mood_after - entry.mood_before)
                        if (entry.mood_before and entry.mood_after)
                        else None,
                    }
                )

        # Calculate average improvement
        improvements = [entry["improvement"] for entry in mood_data if entry["improvement"] is not None]
        avg_improvement = sum(improvements) / len(improvements) if improvements else 0

        # Calculate mood distribution
        mood_distribution = {}
        for entry in mood_data:
            if entry["mood_before"]:
                mood = entry["mood_before"]
                mood_distribution[mood] = mood_distribution.get(mood, 0) + 1

        return {
            "daily_moods": mood_data,
            "mood_trends": mood_data,
            "average_improvement": avg_improvement,
            "mood_distribution": mood_distribution,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to get mood trends: {str(e)}"
        )


@router.get("/analytics/card-frequency")
@limiter.limit("10/minute")
async def get_card_frequency(
    request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get card frequency analytics."""
    try:
        entries = db.query(UserReadingJournal).filter(UserReadingJournal.user_id == current_user.id).all()

        card_counts = {}
        for entry in entries:
            if entry.reading_snapshot and "cards" in entry.reading_snapshot:
                for card in entry.reading_snapshot["cards"]:
                    card_name = card.get("name", "Unknown")
                    card_counts[card_name] = card_counts.get(card_name, 0) + 1

        frequency_data = [
            {"card_name": name, "count": count, "frequency": count}
            for name, count in sorted(card_counts.items(), key=lambda x: x[1], reverse=True)
        ]

        return {"most_common_cards": frequency_data, "card_frequency": frequency_data}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to get card frequency: {str(e)}"
        )


@router.get("/analytics/growth-metrics")
@limiter.limit("10/minute")
async def get_growth_metrics(
    request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get user's personal growth metrics.

    Returns metrics like mood improvement trends, reading consistency,
    and overall development scores.

    Args:
        current_user: Authenticated user
        db: Database session

    Returns:
        dict: Growth metrics data
    """
    try:
        # Get entries from the last month
        one_month_ago = datetime.utcnow() - timedelta(days=30)
        entries = (
            db.query(UserReadingJournal)
            .filter(UserReadingJournal.user_id == current_user.id, UserReadingJournal.created_at >= one_month_ago)
            .order_by(UserReadingJournal.created_at)
            .all()
        )

        # Calculate growth metrics
        mood_improvements = []
        for entry in entries:
            if entry.mood_before and entry.mood_after:
                mood_improvements.append(entry.mood_after - entry.mood_before)

        avg_mood_improvement = sum(mood_improvements) / len(mood_improvements) if mood_improvements else 0

        growth_data = {
            "entries_count": len(entries),
            "average_mood_improvement": avg_mood_improvement,
            "consistency_score": len(entries) / 30.0,  # entries per day
            "introspection_rate": sum(1 for entry in entries if entry.personal_notes) / len(entries) if entries else 0,
        }

        return {
            "mood_improvement_trend": growth_data,
            "growth_metrics": growth_data,
            "outcome_satisfaction_trend": growth_data,
            "reading_consistency": growth_data["consistency_score"],
            "personal_development_score": min(
                1.0, growth_data["consistency_score"] + growth_data["introspection_rate"]
            ),
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to get growth metrics: {str(e)}"
        )


# --- Reminder Endpoints ---


@router.get("/reminders", response_model=list[ReminderResponse])
@limiter.limit("30/minute")
async def get_reminders(
    request: Request,
    pending_only: bool = Query(True, description="Show only pending reminders"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get user's reminders.

    Args:
        pending_only: Show only pending reminders
        current_user: Authenticated user
        db: Database session

    Returns:
        List[ReminderResponse]: List of reminders
    """
    query = (
        db.query(ReadingReminder)
        .options(joinedload(ReadingReminder.journal_entry))
        .filter(ReadingReminder.user_id == current_user.id)
    )

    if pending_only:
        query = query.filter(
            ReadingReminder.is_completed.is_(False)
            # Note: Removed date filter to show all pending reminders
        )

    reminders = query.order_by(ReadingReminder.reminder_date).all()
    return reminders


@router.post("/reminders", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_reminder(
    request: Request,
    reminder: ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new reminder.

    Args:
        reminder: Reminder data
        current_user: Authenticated user
        db: Database session

    Returns:
        ReminderResponse: Created reminder
    """
    # Verify journal entry belongs to user
    journal_entry = (
        db.query(UserReadingJournal)
        .filter(UserReadingJournal.id == reminder.journal_entry_id, UserReadingJournal.user_id == current_user.id)
        .first()
    )

    if not journal_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")

    db_reminder = ReadingReminder(
        user_id=current_user.id,
        journal_entry_id=reminder.journal_entry_id,
        reminder_type=reminder.reminder_type,
        reminder_date=reminder.reminder_date,
        message=reminder.message,
    )

    db.add(db_reminder)
    db.commit()
    db.refresh(db_reminder)

    return db_reminder


@router.put("/reminders/{reminder_id}")
@limiter.limit("10/minute")
async def update_reminder(
    request: Request,
    reminder_id: int,
    reminder_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a reminder.

    Args:
        reminder_id: Reminder ID
        reminder_data: Data to update
        current_user: Authenticated user
        db: Database session

    Returns:
        dict: Success message
    """
    reminder = (
        db.query(ReadingReminder)
        .filter(ReadingReminder.id == reminder_id, ReadingReminder.user_id == current_user.id)
        .first()
    )

    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")

        # Update fields from reminder_data
    if "is_completed" in reminder_data:
        reminder.is_completed = reminder_data["is_completed"]

    db.commit()
    db.refresh(reminder)

    return {"message": "Reminder updated successfully", "is_completed": reminder.is_completed, "id": reminder.id}


@router.delete("/reminders/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
async def delete_reminder(
    request: Request, reminder_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Delete a reminder.

    Args:
        reminder_id: Reminder ID
        current_user: Authenticated user
        db: Database session

    Returns:
        dict: Success message
    """
    reminder = (
        db.query(ReadingReminder)
        .filter(ReadingReminder.id == reminder_id, ReadingReminder.user_id == current_user.id)
        .first()
    )

    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")

    db.delete(reminder)
    db.commit()

    return {"message": "Reminder deleted successfully"}
