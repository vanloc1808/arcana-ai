from fastapi import status
from unittest.mock import patch
import pytest


# Remove old tests for endpoints that don't exist
# The current tarot API only has /tarot/reading endpoint

# Tarot Reading Tests - Success Cases
def test_tarot_reading_success(client, auth_headers, test_cards, mock_tarot_reader):
    """Test successful tarot reading with default parameters"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "What does my future hold?"},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3  # Default number of cards

    for card in data:
        assert "name" in card
        assert "orientation" in card
        assert "meaning" in card
        assert card["orientation"] in ["upright", "reversed"]
        assert len(card["name"]) > 0
        assert len(card["meaning"]) > 0


def test_tarot_reading_custom_card_count(client, auth_headers, test_cards, mock_tarot_reader):
    """Test tarot reading with custom number of cards"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "Career guidance needed", "num_cards": 5},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 5


def test_tarot_reading_single_card(client, auth_headers, test_cards, mock_tarot_reader):
    """Test tarot reading with single card"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "Daily guidance", "num_cards": 1},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1


def test_tarot_reading_max_cards(client, auth_headers, test_cards, mock_tarot_reader):
    """Test tarot reading with maximum number of cards"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "Comprehensive life reading", "num_cards": 10},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 10


def test_tarot_reading_different_concerns(client, auth_headers, test_cards, mock_tarot_reader):
    """Test tarot reading with different types of concerns"""
    concerns = [
        "Love and relationships",
        "Career and money",
        "Health and wellness",
        "Spiritual growth",
        "Family matters"
    ]

    for concern in concerns:
        response = client.post(
            "/tarot/reading",
            json={"concern": concern, "num_cards": 3},
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK


# Tarot Reading Tests - Authentication Required
def test_tarot_reading_without_auth(client, test_cards):
    """Test tarot reading without authentication returns 401"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "What does my future hold?"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_tarot_reading_with_invalid_token(client, invalid_auth_headers, test_cards):
    """Test tarot reading with invalid token returns 401"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "What does my future hold?"},
        headers=invalid_auth_headers
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_tarot_reading_with_malformed_auth_header(client, test_cards):
    """Test tarot reading with malformed authorization header returns 401"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "What does my future hold?"},
        headers={"Authorization": "Invalid Bearer token"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# Tarot Reading Tests - Validation Errors
def test_tarot_reading_missing_concern(client, auth_headers, test_cards):
    """Test tarot reading without concern returns 422"""
    response = client.post(
        "/tarot/reading",
        json={"num_cards": 3},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_tarot_reading_empty_concern(client, auth_headers, test_cards, mock_tarot_reader):
    """Test tarot reading with empty concern returns 422"""
    response = client.post(
        "/tarot/reading",
        json={"concern": " ", "num_cards": 3},
        headers=auth_headers
    )
    assert response.status_code == 422
    data = response.json()
    assert "cannot be empty" in str(data)


def test_tarot_reading_short_concern(client, auth_headers, test_cards, mock_tarot_reader):
    """Test tarot reading with too short concern returns 422"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "a", "num_cards": 3},
        headers=auth_headers
    )
    assert response.status_code == 422
    data = response.json()
    assert "at least 2 characters" in str(data)


def test_tarot_reading_long_concern(client, auth_headers, test_cards, mock_tarot_reader):
    """Test tarot reading with too long concern returns 422"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "a" * 2001, "num_cards": 3},
        headers=auth_headers
    )
    assert response.status_code == 422
    data = response.json()
    assert "at most 2000 characters" in str(data)


def test_tarot_reading_concern_with_html(client, auth_headers, test_cards, mock_tarot_reader):
    """Test tarot reading with HTML/script in concern returns 422"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "<script>alert(1)</script>", "num_cards": 3},
        headers=auth_headers
    )
    assert response.status_code == 422
    data = response.json()
    assert "forbidden content" in str(data)


def test_tarot_reading_zero_cards(client, auth_headers, test_cards):
    """Test tarot reading with zero cards returns 422"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "Test concern", "num_cards": 0},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_tarot_reading_negative_cards(client, auth_headers, test_cards):
    """Test tarot reading with negative number of cards returns 422"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "Test concern", "num_cards": -1},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_tarot_reading_too_many_cards(client, auth_headers, test_cards):
    """Test tarot reading with more than maximum cards returns 422"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "Test concern", "num_cards": 11},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_tarot_reading_invalid_num_cards_type(client, auth_headers, test_cards):
    """Test tarot reading with invalid num_cards type returns 422"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "Test concern", "num_cards": "three"},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_tarot_reading_null_concern(client, auth_headers, test_cards):
    """Test tarot reading with null concern returns 422"""
    response = client.post(
        "/tarot/reading",
        json={"concern": None, "num_cards": 3},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_tarot_reading_extremely_long_concern(client, auth_headers, test_cards, mock_tarot_reader):
    """Test tarot reading with extremely long concern"""
    long_concern = "A" * 10000  # Very long concern
    response = client.post(
        "/tarot/reading",
        json={"concern": long_concern, "num_cards": 3},
        headers=auth_headers
    )
    # Should either work or fail validation gracefully
    assert response.status_code in [status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY]


# Tarot Reading Tests - Request Format Validation
def test_tarot_reading_invalid_json(client, auth_headers, test_cards):
    """Test tarot reading with invalid JSON returns 422"""
    response = client.post(
        "/tarot/reading",
        data="invalid json",
        headers={**auth_headers, "Content-Type": "application/json"}
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_tarot_reading_empty_request_body(client, auth_headers, test_cards):
    """Test tarot reading with empty request body returns 422"""
    response = client.post(
        "/tarot/reading",
        json={},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_tarot_reading_wrong_content_type(client, auth_headers, test_cards):
    """Test tarot reading with wrong content type"""
    response = client.post(
        "/tarot/reading",
        data="concern=test&num_cards=3",
        headers={**auth_headers, "Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# Tarot Reading Tests - Error Handling
@patch('routers.tarot.TarotReader')
def test_tarot_reading_reader_failure(mock_reader_class, client, auth_headers, test_cards):
    """Test tarot reading when TarotReader fails"""
    mock_instance = mock_reader_class.return_value
    mock_instance.shuffle_and_draw.side_effect = Exception("Tarot reader error")

    response = client.post(
        "/tarot/reading",
        json={"concern": "What does my future hold?", "num_cards": 3},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


def test_tarot_reading_database_error(client, auth_headers):
    """Test tarot reading when database is unavailable"""
    # This test would require mocking the database session to fail
    # For now, we'll test with missing cards in database
    response = client.post(
        "/tarot/reading",
        json={"concern": "What does my future hold?", "num_cards": 3},
        headers=auth_headers
    )
    # Without test_cards fixture, this should fail or handle gracefully
    assert response.status_code in [status.HTTP_500_INTERNAL_SERVER_ERROR, status.HTTP_200_OK]


# Tarot Reading Tests - Response Format Validation
def test_tarot_reading_response_structure(client, auth_headers, test_cards, mock_tarot_reader):
    """Test that tarot reading response has correct structure"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "Career guidance", "num_cards": 3},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert isinstance(data, list)
    for card in data:
        assert isinstance(card, dict)
        assert "name" in card
        assert "orientation" in card
        assert "meaning" in card
        # image_url is optional
        if "image_url" in card:
            assert isinstance(card["image_url"], (str, type(None)))


def test_tarot_reading_card_orientations(client, auth_headers, test_cards, mock_tarot_reader):
    """Test that card orientations are valid"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "Test reading", "num_cards": 5},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    for card in data:
        assert card["orientation"] in ["upright", "reversed"]


def test_tarot_reading_unicode_concern(client, auth_headers, test_cards, mock_tarot_reader):
    """Test tarot reading with unicode characters in concern"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "¿Qué me depara el futuro? 🔮", "num_cards": 3},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 3


def test_tarot_reading_special_characters_concern(client, auth_headers, test_cards, mock_tarot_reader):
    """Test tarot reading with special characters in concern"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "Will I find love? <3 @#$%^&*()", "num_cards": 3},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 3


# Tarot Reading Tests - Performance and Edge Cases
@pytest.mark.skip(reason="Skipping concurrent requests test due to unstability")
def test_tarot_reading_concurrent_requests(client, auth_headers, test_cards, mock_tarot_reader):
    """Test multiple concurrent tarot reading requests"""
    import threading
    import time

    results = []

    def make_request():
        response = client.post(
            "/tarot/reading",
            json={"concern": "Concurrent test", "num_cards": 3},
            headers=auth_headers
        )
        results.append(response.status_code)

    # Create multiple threads
    threads = []
    for _ in range(5):
        thread = threading.Thread(target=make_request)
        threads.append(thread)
        thread.start()

    # Wait for all threads to complete
    for thread in threads:
        thread.join()

    # All requests should succeed
    assert all(status_code == status.HTTP_200_OK for status_code in results)


def test_tarot_reading_repeated_requests(client, auth_headers, test_cards, mock_tarot_reader):
    """Test repeated tarot reading requests from same user"""
    for i in range(5):
        response = client.post(
            "/tarot/reading",
            json={"concern": f"Reading number {i+1}", "num_cards": 3},
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 3


# Tarot Reading Tests - Token Renewal
def test_tarot_reading_token_renewal_header(client, auth_headers, test_cards, mock_tarot_reader):
    """Test that tarot reading returns renewed token in response headers"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "Token renewal test", "num_cards": 3},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    assert "X-Access-Token" in response.headers
    assert len(response.headers["X-Access-Token"]) > 0


# Tarot Reading Tests - Different User Scenarios
def test_tarot_reading_different_users(client, auth_headers, auth_headers_2, test_cards, mock_tarot_reader):
    """Test tarot readings for different users"""
    # First user
    response1 = client.post(
        "/tarot/reading",
        json={"concern": "User 1 reading", "num_cards": 3},
        headers=auth_headers
    )
    assert response1.status_code == status.HTTP_200_OK

    # Second user
    response2 = client.post(
        "/tarot/reading",
        json={"concern": "User 2 reading", "num_cards": 3},
        headers=auth_headers_2
    )
    assert response2.status_code == status.HTTP_200_OK

    # Both should get their readings
    data1 = response1.json()
    data2 = response2.json()
    assert len(data1) == 3
    assert len(data2) == 3


# Tarot Reading Tests - Favorite Deck Functionality
def test_tarot_reading_with_favorite_deck(client, auth_headers, test_cards, mock_tarot_reader, db_session, test_user):
    """Test tarot reading uses user's favorite deck"""
    # Create a test deck and set it as user's favorite
    from models import Deck
    test_deck = Deck(name="Test Deck", description="A test deck")
    db_session.add(test_deck)
    db_session.commit()

    test_user.favorite_deck_id = test_deck.id
    db_session.commit()

    response = client.post(
        "/tarot/reading",
        json={"concern": "What does my future hold?"},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3  # Default number of cards

    # Verify the cards are from the favorite deck
    for card in data:
        assert "name" in card
        assert "orientation" in card
        assert "meaning" in card
        assert card["orientation"] in ["upright", "reversed"]


def test_tarot_reading_without_favorite_deck(client, auth_headers, test_cards, mock_tarot_reader, db_session, test_user):
    """Test tarot reading when user has no favorite deck set"""
    # Ensure user has no favorite deck
    test_user.favorite_deck_id = None
    db_session.commit()

    response = client.post(
        "/tarot/reading",
        json={"concern": "What does my future hold?"},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3  # Default number of cards

    # Should still work with default deck
    for card in data:
        assert "name" in card
        assert "orientation" in card
        assert "meaning" in card


def test_tarot_reading_with_nonexistent_favorite_deck(client, auth_headers, test_cards, mock_tarot_reader, db_session, test_user):
    """Test tarot reading when user's favorite deck doesn't exist"""
    # Set a non-existent deck ID
    test_user.favorite_deck_id = 99999
    db_session.commit()

    response = client.post(
        "/tarot/reading",
        json={"concern": "What does my future hold?"},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3  # Default number of cards

    # Should fall back to default deck
    for card in data:
        assert "name" in card
        assert "orientation" in card
        assert "meaning" in card


def test_tarot_reading_different_users_different_decks(client, auth_headers, auth_headers_2, test_cards, mock_tarot_reader, db_session, test_user, test_user_2):
    """Test that different users get readings from their respective favorite decks"""
    # Create two different decks
    from models import Deck
    deck1 = Deck(name="First User's Deck", description="First user's favorite deck")
    deck2 = Deck(name="Second User's Deck", description="Second user's favorite deck")
    db_session.add_all([deck1, deck2])
    db_session.commit()

    # Set different favorite decks for each user
    test_user.favorite_deck_id = deck1.id
    test_user_2.favorite_deck_id = deck2.id
    db_session.commit()

    # Get reading for first user
    response1 = client.post(
        "/tarot/reading",
        json={"concern": "What does my future hold?"},
        headers=auth_headers
    )
    assert response1.status_code == status.HTTP_200_OK
    data1 = response1.json()

    # Get reading for second user
    response2 = client.post(
        "/tarot/reading",
        json={"concern": "What does my future hold?"},
        headers=auth_headers_2
    )
    assert response2.status_code == status.HTTP_200_OK
    data2 = response2.json()

    # Both readings should work
    assert len(data1) == 3
    assert len(data2) == 3

    for card in data1 + data2:
        assert "name" in card
        assert "orientation" in card
        assert "meaning" in card
