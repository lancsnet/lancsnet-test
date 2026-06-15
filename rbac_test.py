import requests
import pytest

BASE_URL = "http://localhost:8921/api/v1"
session = requests.Session()

def get_csrf():
    """Lấy CSRF bằng cách hit endpoint, đọc từ cookie vsp_csrf"""
    session.get("http://localhost:8921/api/v1/csrf")
    token = session.cookies.get("vsp_csrf", "")
    print(f"[setup] CSRF from cookie: {token[:20]}..." if token else "[setup] CSRF cookie missing!")
    return token

def login(email, password, csrf):
    r = session.post(f"{BASE_URL}/auth/login",
        json={"email": email, "password": password},
        headers={"X-CSRF-Token": csrf})
    if r.status_code == 200:
        return r.json().get("token", "")
    print(f"[login] {email} → {r.status_code}: {r.text[:100]}")
    return ""

CSRF = get_csrf()

# ── THAY PASSWORD ADMIN VÀO ĐÂY ──
ADMIN_TOKEN = login("admin@lancs.local", "Admin2026!", CSRF)
DEV_TOKEN   = login("cap_dev@lancs.local", "LowPriv2026!", CSRF)

print(f"[setup] ADMIN: {'OK' if ADMIN_TOKEN else 'MISSING'}")
print(f"[setup] DEV:   {'OK' if DEV_TOKEN else 'MISSING'}")

TOKENS = {
    "admin":   f"Bearer {ADMIN_TOKEN}" if ADMIN_TOKEN else "",
    "dev":     f"Bearer {DEV_TOKEN}"   if DEV_TOKEN   else "",
    "no_auth": None,
}

SCHEDULE_PAYLOAD = {
    "name": "Test Scan",
    "cadence": "30d",
    "target_path": "lancsnet-group/Lancsnet-project",
}

def post_schedule(token_key, payload=None):
    # Refresh CSRF từ cookie mỗi lần gửi (double submit pattern)
    csrf = session.cookies.get("vsp_csrf", CSRF)
    headers = {"X-CSRF-Token": csrf}
    token = TOKENS.get(token_key)
    if token:
        headers["Authorization"] = token
    body = payload if payload is not None else SCHEDULE_PAYLOAD
    return session.post(f"{BASE_URL}/conmon/schedules",
                        json=body, headers=headers)

def test_dev_cannot_create_schedule():
    r = post_schedule("dev")
    assert r.status_code == 403, f"Expected 403, got {r.status_code} | {r.text}"

def test_admin_can_create_schedule():
    r = post_schedule("admin")
    assert r.status_code in (200, 201), f"Expected 2xx, got {r.status_code} | {r.text}"

def test_no_auth_returns_401():
    r = post_schedule("no_auth")
    assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"

def test_missing_target_path_returns_400():
    r = post_schedule("admin", payload={"name": "No Target", "cadence": "30d"})
    assert r.status_code == 400, f"[FIX-002] Got {r.status_code} | {r.text}"

def test_empty_payload_returns_400():
    r = post_schedule("admin", payload={})
    assert r.status_code == 400, f"Expected 400, got {r.status_code} | {r.text}"
