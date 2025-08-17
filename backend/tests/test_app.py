from fastapi import status
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)


def test_read_root(client):
    """Test the root endpoint returns correct welcome message"""
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["message"] == "Welcome to the ArcanaAI API"
    assert data["docs_url"] == "/docs"
    assert data["redoc_url"] == "/redoc"


def test_health_check(client):
    """Test the health check endpoint"""
    response = client.get("/health/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"
    assert data["message"] == "Application is healthy"


def test_docs_available(client):
    """Test that API documentation is accessible"""
    response = client.get("/docs")
    assert response.status_code == status.HTTP_200_OK


def test_redoc_available(client):
    """Test that ReDoc documentation is accessible"""
    response = client.get("/redoc")
    assert response.status_code == status.HTTP_200_OK


def test_openapi_schema_available(client):
    """Test that OpenAPI schema is accessible"""
    response = client.get("/openapi.json")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "openapi" in data
    assert data["info"]["title"] == "ArcanaAI API"
