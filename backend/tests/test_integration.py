"""Tests de integracion con TestClient."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestHealth:
    def test_health_ok(self):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_health_detailed_ok(self):
        r = client.get("/health/detailed")
        assert r.status_code == 200
        data = r.json()
        assert "services" in data
        assert "ollama" in data["services"]

    def test_shared_project_no_auth_required(self):
        r = client.get("/shared/nonexistent")
        assert r.status_code == 404

    def test_health_no_auth_required(self):
        r = client.get("/health")
        assert r.status_code == 200


class TestVersioning:
    def test_v1_prefix_on_api_routes(self):
        r = client.get("/api/v1/settings")
        assert r.status_code == 200

    def test_legacy_paths_return_404(self):
        r = client.post("/chat", json={"message": "hi"})
        assert r.status_code == 404
