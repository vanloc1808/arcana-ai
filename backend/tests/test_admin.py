import pytest
from fastapi import status
from models import User
from routers.auth import create_access_token
from database import get_db

@pytest.fixture(scope="function")
def admin_auth_headers(db_session):
    """Create authentication headers for an admin user"""
    # Create admin user
    admin_user = User(
        username="adminuser",
        email="admin@example.com",
        is_active=True,
        is_admin=True
    )
    admin_user.password = "adminpassword"
    db_session.add(admin_user)
    db_session.commit()
    db_session.refresh(admin_user)
    # Generate token
    token = create_access_token(data={"sub": admin_user.username})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="function")
def user_auth_headers(test_user):
    """Create authentication headers for non-admin user"""
    from routers.auth import create_access_token
    token = create_access_token(data={"sub": test_user.username})
    return {"Authorization": f"Bearer {token}"}

# --- Access Control ---
def test_admin_access_required(client, user_auth_headers):
    resp = client.get("/admin/dashboard", headers=user_auth_headers)
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert "Admin access required" in resp.text

def test_admin_access_allowed(client, admin_auth_headers):
    resp = client.get("/admin/dashboard", headers=admin_auth_headers)
    assert resp.status_code == status.HTTP_200_OK
    assert "total_users" in resp.text

# --- Dashboard ---
def test_admin_dashboard_stats(client, admin_auth_headers):
    resp = client.get("/admin/dashboard", headers=admin_auth_headers)
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert "total_users" in data
    assert "recent_users" in data

# --- Users CRUD ---
def test_admin_list_users(client, admin_auth_headers):
    resp = client.get("/admin/users", headers=admin_auth_headers)
    assert resp.status_code == status.HTTP_200_OK
    assert isinstance(resp.json(), list)

def test_admin_get_user(client, admin_auth_headers):
    users = client.get("/admin/users", headers=admin_auth_headers).json()
    if users:
        user_id = users[0]["id"]
        resp = client.get(f"/admin/users/{user_id}", headers=admin_auth_headers)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["id"] == user_id

def test_admin_update_user(client, admin_auth_headers):
    users = client.get("/admin/users", headers=admin_auth_headers).json()
    if users:
        user_id = users[0]["id"]
        resp = client.put(
            f"/admin/users/{user_id}",
            headers=admin_auth_headers,
            json={"is_active": False}
        )
        assert resp.status_code in (status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY)

# --- Cards CRUD ---
def test_admin_list_cards(client, admin_auth_headers):
    resp = client.get("/admin/cards", headers=admin_auth_headers)
    assert resp.status_code == status.HTTP_200_OK
    assert isinstance(resp.json(), list)

# --- Decks CRUD ---
def test_admin_list_decks(client, admin_auth_headers):
    resp = client.get("/admin/decks", headers=admin_auth_headers)
    assert resp.status_code == status.HTTP_200_OK
    assert isinstance(resp.json(), list)

# --- Spreads CRUD ---
def test_admin_list_spreads(client, admin_auth_headers):
    resp = client.get("/admin/spreads", headers=admin_auth_headers)
    assert resp.status_code == status.HTTP_200_OK
    assert isinstance(resp.json(), list)

# --- Shared Readings ---
def test_admin_list_shared_readings(client, admin_auth_headers):
    resp = client.get("/admin/shared-readings", headers=admin_auth_headers)
    assert resp.status_code == status.HTTP_200_OK
    assert isinstance(resp.json(), list)

# --- Search ---
def test_admin_search_users(client, admin_auth_headers):
    resp = client.post(
        "/admin/search",
        headers=admin_auth_headers,
        json={"query": "a", "model_type": "users", "offset": 0, "limit": 1}
    )
    assert resp.status_code == status.HTTP_200_OK
    assert isinstance(resp.json(), list)

# --- Admin Full Name Tests ---
def test_admin_update_user_full_name(client, admin_auth_headers, test_user, db_session):
    """Test admin can update user full name"""
    response = client.put(
        f"/admin/users/{test_user.id}",
        headers=admin_auth_headers,
        json={"full_name": "Admin Updated Name"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == "Admin Updated Name"

    # Verify the change persists by getting the user again
    response = client.get(f"/admin/users/{test_user.id}", headers=admin_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == "Admin Updated Name"


def test_admin_update_user_full_name_empty_string(client, admin_auth_headers, test_user, db_session):
    """Test admin can clear user full name with empty string"""
    response = client.put(
        f"/admin/users/{test_user.id}",
        headers=admin_auth_headers,
        json={"full_name": ""}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] is None

    # Verify the change persists by getting the user again
    response = client.get(f"/admin/users/{test_user.id}", headers=admin_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] is None


def test_admin_get_user_includes_full_name(client, admin_auth_headers, test_user, db_session):
    """Test admin user detail view includes full_name field"""
    # Set a full name first via admin API
    response = client.put(
        f"/admin/users/{test_user.id}",
        headers=admin_auth_headers,
        json={"full_name": "Test Full Name"}
    )
    assert response.status_code == status.HTTP_200_OK

    response = client.get(f"/admin/users/{test_user.id}", headers=admin_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "full_name" in data
    assert data["full_name"] == "Test Full Name"


def test_admin_list_users_includes_full_name(client, admin_auth_headers, test_user, db_session):
    """Test admin user list includes full_name field"""
    # Set a full name first via admin API
    response = client.put(
        f"/admin/users/{test_user.id}",
        headers=admin_auth_headers,
        json={"full_name": "List Test Name"}
    )
    assert response.status_code == status.HTTP_200_OK

    response = client.get("/admin/users", headers=admin_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)

    # Find our test user in the list
    test_user_data = next((user for user in data if user["id"] == test_user.id), None)
    assert test_user_data is not None
    assert "full_name" in test_user_data
    assert test_user_data["full_name"] == "List Test Name"


def test_admin_search_users_by_full_name(client, admin_auth_headers, test_user, db_session):
    """Test admin can search users by full name"""
    # Set a unique full name for searching via admin API
    response = client.put(
        f"/admin/users/{test_user.id}",
        headers=admin_auth_headers,
        json={"full_name": "Searchable Unique Name"}
    )
    assert response.status_code == status.HTTP_200_OK

    response = client.post(
        "/admin/search",
        headers=admin_auth_headers,
        json={"query": "Searchable", "model_type": "users", "offset": 0, "limit": 10}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)

    # Verify our user appears in search results
    found_user = next((user for user in data if user["id"] == test_user.id), None)
    assert found_user is not None
    assert found_user["full_name"] == "Searchable Unique Name"
