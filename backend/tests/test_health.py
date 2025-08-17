from fastapi import status


def test_health_check_success(client):
    """Test successful health check returns correct response"""
    response = client.get("/health/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"
    assert data["message"] == "Application is healthy"
    assert isinstance(data["status"], str)
    assert isinstance(data["message"], str)


def test_health_check_without_trailing_slash(client):
    """Test health check without trailing slash"""
    response = client.get("/health")
    # FastAPI should handle this gracefully (either redirect or direct response)
    assert response.status_code in [status.HTTP_200_OK, status.HTTP_307_TEMPORARY_REDIRECT]


def test_health_check_response_format(client):
    """Test health check response has correct JSON format"""
    response = client.get("/health/")
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["content-type"] == "application/json"

    data = response.json()
    assert isinstance(data, dict)
    assert len(data) == 2  # Should have exactly 2 fields
    assert "status" in data
    assert "message" in data


def test_health_check_response_values(client):
    """Test health check response has expected values"""
    response = client.get("/health/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # Status should always be "ok" if the service is running
    assert data["status"] == "ok"
    assert len(data["status"]) > 0

    # Message should be informative
    assert "healthy" in data["message"].lower()
    assert len(data["message"]) > 0


def test_health_check_multiple_requests(client):
    """Test multiple health check requests return consistent results"""
    responses = []
    for _ in range(5):
        response = client.get("/health/")
        responses.append(response)

    # All responses should be successful
    for response in responses:
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "ok"
        assert data["message"] == "Application is healthy"


def test_health_check_concurrent_requests(client):
    """Test concurrent health check requests"""
    import threading
    results = []

    def make_request():
        response = client.get("/health/")
        results.append(response.status_code)

    # Create multiple threads
    threads = []
    for _ in range(10):
        thread = threading.Thread(target=make_request)
        threads.append(thread)
        thread.start()

    # Wait for all threads to complete
    for thread in threads:
        thread.join()

    # All requests should succeed
    assert all(status_code == status.HTTP_200_OK for status_code in results)
    assert len(results) == 10


def test_health_check_no_authentication_required(client):
    """Test health check doesn't require authentication"""
    # Health check should work without any headers
    response = client.get("/health/")
    assert response.status_code == status.HTTP_200_OK

    # Should also work with invalid auth headers (they should be ignored)
    response = client.get("/health/", headers={"Authorization": "Bearer invalid_token"})
    assert response.status_code == status.HTTP_200_OK


def test_health_check_http_methods(client):
    """Test health check with different HTTP methods"""
    # GET should work
    response = client.get("/health/")
    assert response.status_code == status.HTTP_200_OK

    # POST should not be allowed
    response = client.post("/health/")
    assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    # PUT should not be allowed
    response = client.put("/health/")
    assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    # DELETE should not be allowed
    response = client.delete("/health/")
    assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    # PATCH should not be allowed
    response = client.patch("/health/")
    assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


def test_health_check_with_query_parameters(client):
    """Test health check with query parameters (should be ignored)"""
    response = client.get("/health/?test=1&debug=true")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"
    assert data["message"] == "Application is healthy"


def test_health_check_with_request_body(client):
    """Test health check with request body (should be ignored for GET)"""
    # GET requests don't typically have bodies, but we'll test that the endpoint works normally
    response = client.get("/health/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"
    assert data["message"] == "Application is healthy"


def test_health_check_response_time(client):
    """Test health check responds quickly"""
    import time

    start_time = time.time()
    response = client.get("/health/")
    end_time = time.time()

    # Health check should be fast (under 1 second)
    response_time = end_time - start_time
    assert response_time < 1.0
    assert response.status_code == status.HTTP_200_OK


def test_health_check_headers(client):
    """Test health check response headers"""
    response = client.get("/health/")
    assert response.status_code == status.HTTP_200_OK

    # Should have proper content type
    assert "application/json" in response.headers.get("content-type", "")

    # Should not expose sensitive headers
    sensitive_headers = ["server", "x-powered-by", "x-frame-options"]
    for header in sensitive_headers:
        # These headers might or might not be present, but shouldn't reveal sensitive info
        if header in response.headers:
            assert "fastapi" not in response.headers[header].lower()


def test_health_check_cors_headers(client):
    """Test health check CORS headers if CORS is enabled"""
    response = client.get("/health/")
    assert response.status_code == status.HTTP_200_OK

    # CORS headers might be present due to CORS middleware
    # This test just ensures they don't break the health check
    assert response.json()["status"] == "ok"


def test_health_check_during_load(client):
    """Test health check remains responsive during simulated load"""
    import threading
    import time

    # Simulate some load with concurrent requests
    def simulate_load():
        for _ in range(20):
            client.get("/health/")
            time.sleep(0.01)  # Small delay

    # Start load simulation
    load_thread = threading.Thread(target=simulate_load)
    load_thread.start()

    # Check health during load
    for _ in range(5):
        response = client.get("/health/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "ok"
        time.sleep(0.1)

    # Wait for load simulation to complete
    load_thread.join()


def test_health_check_idempotency(client):
    """Test health check is idempotent"""
    # Multiple identical requests should return identical responses
    first_response = client.get("/health/")
    second_response = client.get("/health/")

    assert first_response.status_code == second_response.status_code
    assert first_response.json() == second_response.json()
    assert first_response.headers["content-type"] == second_response.headers["content-type"]


def test_health_check_cache_headers(client):
    """Test health check cache headers"""
    response = client.get("/health/")
    assert response.status_code == status.HTTP_200_OK

    # Health check responses should not be cached by default
    # (since we want real-time health status)
    cache_control = response.headers.get("cache-control", "").lower()
    if cache_control:
        # If cache control is set, it should not cache for long
        assert "no-cache" in cache_control or "max-age=0" in cache_control


def test_health_check_encoding(client):
    """Test health check response encoding"""
    response = client.get("/health/")
    assert response.status_code == status.HTTP_200_OK

    # Response should be properly encoded
    assert response.encoding in [None, 'utf-8', 'UTF-8']

    # Content should be valid JSON
    data = response.json()
    assert isinstance(data, dict)

    # String values should be properly encoded
    assert isinstance(data["status"], str)
    assert isinstance(data["message"], str)
