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
    assert data["scalar_url"] == "/scalar"


def test_health_check(client):
    """Test the health check endpoint"""
    response = client.get("/api/health/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"
    assert data["message"] == "Application is healthy"


def test_legacy_api_route_is_not_exposed(client):
    with TestClient(app) as raw_client:
        response = raw_client.get("/health/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_versioned_api_routes_use_api_prefix(client):
    paths = client.get("/openapi.json").json()["paths"]
    assert all(path == "/" or path.startswith("/api/") for path in paths)


def test_docs_available(client):
    """Test that the Swagger UI documentation is accessible"""
    response = client.get("/docs")
    assert response.status_code == status.HTTP_200_OK


def test_redoc_available(client):
    """Test that ReDoc documentation is accessible"""
    response = client.get("/redoc")
    assert response.status_code == status.HTTP_200_OK


def test_scalar_available(client):
    """Test that the Scalar API reference is served at /scalar"""
    response = client.get("/scalar")
    assert response.status_code == status.HTTP_200_OK
    assert "text/html" in response.headers["content-type"]
    body = response.text.lower()
    # Scalar renders an HTML shell that loads the Scalar reference bundle and
    # points it at the generated OpenAPI schema.
    assert "@scalar/api-reference" in body
    assert "/openapi.json" in body


def test_openapi_schema_available(client):
    """Test that OpenAPI schema is accessible"""
    response = client.get("/openapi.json")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "openapi" in data
    assert data["info"]["title"] == "ArcanaAI API"
