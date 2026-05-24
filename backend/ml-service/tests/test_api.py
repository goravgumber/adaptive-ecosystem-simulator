import pytest
import httpx

BASE = "http://localhost:8000"


@pytest.mark.asyncio
async def test_health_endpoint():
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{BASE}/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data


@pytest.mark.asyncio
async def test_models_info():
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{BASE}/models/info")
    assert resp.status_code == 200
    data = resp.json()
    assert "version" in data


@pytest.mark.asyncio
async def test_insights():
    payload = {"plants": 800, "herbivores": 45, "carnivores": 90, "tick": 150, "history": []}
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{BASE}/insights", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "insight" in data
