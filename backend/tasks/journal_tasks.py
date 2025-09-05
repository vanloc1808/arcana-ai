"""
Journal Background Tasks

This module contains background tasks for the journal feature including:
- Processing reading reminders
- Generating monthly analytics
- Cleaning up old analytics data

Dependencies:
- Celery for task processing
- SQLAlchemy for database operations
- Custom email and notification services
"""

from datetime import datetime, timedelta

from database import SessionLocal
from models import ReadingReminder, User, UserReadingAnalytics, UserReadingJournal

# from utils.email_service import send_reminder_email  # Mock for tests


def send_reminder_email(reminder):
    """
    Mock function for sending reminder emails.
    In production, this would integrate with an actual email service.
    """
    reminder_id = reminder.id if reminder else "None"
    print(f"Sending reminder email for reminder {reminder_id}")
    # Mock email sending logic
    return True


def process_reading_reminders(db_session=None):
    """
    Process pending reading reminders.

    This function checks for reminders that are due and sends notifications
    to users about their follow-up readings.
    """
    db = db_session or SessionLocal()
    should_close = db_session is None
    try:
        now = datetime.utcnow()
        pending_reminders = (
            db.query(ReadingReminder)
            .filter(ReadingReminder.reminder_date <= now, ReadingReminder.is_sent.is_(False))
            .all()
        )

        processed_count = 0
        for reminder in pending_reminders:
            try:
                # Send reminder notification
                send_reminder_email(reminder)
                reminder.is_sent = True
                processed_count += 1
                print(f"Reminder sent for user {reminder.user_id}")
            except Exception as e:
                print(f"Failed to send reminder {reminder.id}: {str(e)}")

        db.commit()
        return processed_count

    except Exception as e:
        db.rollback()
        print(f"Error processing reminders: {str(e)}")
        return 0
    finally:
        if should_close:
            db.close()


def generate_analytics_data(user_id, entries):
    """
    Generate analytics data for a specific user.
    """
    analytics_data = {
        "total_entries": len(entries),
        "mood_entries": len([e for e in entries if e.mood_before or e.mood_after]),
        "notes_entries": len([e for e in entries if e.personal_notes]),
        "favorite_entries": len([e for e in entries if e.is_favorite]),
    }
    return analytics_data


def generate_monthly_analytics(db_session=None):
    """
    Generate monthly analytics for all active users.

    This function creates analytics summaries for users with journal entries
    and stores them in the analytics table.
    """
    db = db_session or SessionLocal()
    should_close = db_session is None
    try:
        # Get current month date range
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Get users with journal entries this month
        users_with_entries = (
            db.query(User)
            .join(UserReadingJournal)
            .filter(UserReadingJournal.created_at >= month_start)
            .distinct()
            .all()
        )

        analytics_generated = 0

        for user in users_with_entries:
            try:
                # Generate analytics for this user
                entries = (
                    db.query(UserReadingJournal)
                    .filter(UserReadingJournal.user_id == user.id, UserReadingJournal.created_at >= month_start)
                    .all()
                )

                analytics_data = generate_analytics_data(user.id, entries)

                # Store analytics
                analytics = UserReadingAnalytics(
                    user_id=user.id,
                    analysis_type="monthly_summary",
                    analysis_data=analytics_data,
                    analysis_period_start=month_start.date(),
                    analysis_period_end=now.date(),
                )

                db.add(analytics)
                analytics_generated += 1

            except Exception as e:
                print(f"Failed to generate analytics for user {user.id}: {str(e)}")

        db.commit()
        return analytics_generated

    except Exception as e:
        db.rollback()
        print(f"Error generating monthly analytics: {str(e)}")
        return 0
    finally:
        if should_close:
            db.close()


def cleanup_old_analytics(db_session=None):
    """
    Clean up analytics data older than 1 year.

    This function removes old analytics records to keep the database clean
    and maintain good performance.
    """
    db = db_session or SessionLocal()
    should_close = db_session is None
    try:
        one_year_ago = datetime.utcnow() - timedelta(days=365)

        # Delete old analytics records
        deleted_count = (
            db.query(UserReadingAnalytics)
            .filter(UserReadingAnalytics.generated_at < one_year_ago)
            .delete(synchronize_session=False)
        )

        db.commit()
        return deleted_count

    except Exception as e:
        db.rollback()
        print(f"Error cleaning up old analytics: {str(e)}")
        return 0
    finally:
        if should_close:
            db.close()
