import base64, json, urllib.request as U, urllib.error as E, ssl
B = "https://127.0.0.1:30800"; PW = "RoleTest2026!!"; C = ssl._create_unverified_context()
def b64d(x): return base64.urlsafe_b64decode(x + "=" * (-len(x) % 4))
def b64e(d): return base64.urlsafe_b64encode(d).rstrip(b"=").decode()
def login(r):
    x = U.urlopen(U.Request(B + "/api/v1/auth/login", json.dumps({"email": "rbac-" + r + "@lancs.local", "password": PW}).encode(), {"Content-Type": "application/json"}, method="POST"), timeout=12, context=C)
    return json.loads(x.read())["token"]
def hit(p, tok):
    try: return str(U.urlopen(U.Request(B + p, headers={"Authorization": "Bearer " + tok}), timeout=8, context=C).status)
    except E.HTTPError as e: return str(e.code)
    except Exception as ex: return "ERR:" + str(ex)[:25]
def mk(h, claims, sig): return h + "." + b64e(json.dumps(claims, separators=(",", ":")).encode()) + "." + sig
dev = login("dev")
h, p, s = dev.split(".")
pl = json.loads(b64d(p))
print("=== JWT INTEGRITY / RBAC BYPASS TEST ===")
print("dev real claims: role=%s tid=%s exp=%s uid=%s" % (pl.get("role"), pl.get("tid"), pl.get("exp"), pl.get("uid")))
ADM = "/api/v1/admin/users"; RD = "/api/v1/vsp/findings"
print("\n[baseline] dev real token  -> %s : %s  (expect 403)" % (ADM, hit(ADM, dev)))
pa = dict(pl); pa["role"] = "admin"
print("[T1] forge role=admin, KEEP orig sig -> %s : %s  (200=CRITICAL forgeable)" % (ADM, hit(ADM, mk(h, pa, s))))
print("[T2] forge role=admin, NO sig        -> %s : %s  (200=CRITICAL)" % (ADM, hit(ADM, h + "." + b64e(json.dumps(pa, separators=(",", ":")).encode()) + ".")))
hn = b64e(b'{"alg":"none","typ":"JWT"}')
print("[T3] alg:none role=admin             -> %s : %s  (200=CRITICAL)" % (ADM, hit(ADM, hn + "." + b64e(json.dumps(pa, separators=(",", ":")).encode()) + ".")))
pe = dict(pl); pe["exp"] = 1000000000
print("[T4] expired exp (2001)              -> %s : %s  (200=exp khong enforce)" % (RD, hit(RD, mk(h, pe, s))))
pt = dict(pl); pt["tid"] = "00000000-0000-0000-0000-000000000000"
print("[T5] doi tid (cross-tenant)          -> %s : %s  (200=khong verify tid)" % (RD, hit(RD, mk(h, pt, s))))
print("[T6] token rac 'a.b.c'               -> %s : %s  (200=khong verify gi)" % (RD, hit(RD, "a.b.c")))
print("[T7] khong token                     -> %s : %s  (expect 401)" % (RD, hit(RD, "")))
