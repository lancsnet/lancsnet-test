import urllib.request as U, urllib.error as E, ssl, json, time, re, sys
B = "https://127.0.0.1:30800"; PW = "RoleTest2026!!"; C = ssl._create_unverified_context()
RS = ["admin", "analyst", "dev", "qa", "auditor"]
EM = {r: "rbac-" + r + "@lancs.local" for r in RS}
EPS = sorted(set(open("paths.txt").read().split()))
SEC = re.compile(r"(passwd|password|secret|api[_-]?key|token|private[_-]?key|BEGIN [A-Z ]*PRIVATE|aws_access|bearer )", re.I)
SENS = re.compile(r"/(admin|audit|sso|tenants|api-keys|integrations|settings|agentic|alerts|recognition|residency|sbom|threat-hunt|ueba|analytics|forensics|correlation|soc|logs|governance|compliance|oscal|conmon|cisa|cspm|assets|software-inventory|ti)/?")
def lg(r):
    for _ in range(5):
        try:
            x = U.urlopen(U.Request(B + "/api/v1/auth/login", json.dumps({"email": EM[r], "password": PW}).encode(), {"Content-Type": "application/json"}, method="POST"), timeout=12, context=C)
            return json.loads(x.read()).get("token", "")
        except E.HTTPError as e:
            if e.code == 429: time.sleep(13); continue
            return ""
        except Exception: time.sleep(2)
    return ""
def hit(p, t):
    for _ in range(3):
        try:
            x = U.urlopen(U.Request(B + p, headers={"Authorization": "Bearer " + t}), timeout=8, context=C)
            b = x.read().decode("utf-8", "replace")
            return (str(x.status), len(b), "SEC" if SEC.search(b) else "")
        except E.HTTPError as e:
            if e.code == 429: time.sleep(9); continue
            return (str(e.code), 0, "")
        except Exception: return ("ERR", 0, "")
    return ("429", 0, "")
TK = {r: lg(r) for r in RS}
leaks = []; secs = []; rt = 0
for p in EPS:
    sens = bool(SENS.search(p))
    rd = {r: hit(p, TK[r]) if TK[r] else ("n/a", 0, "") for r in RS}
    for low in ("dev", "qa"):
        if rd[low][0] == "200" and sens: leaks.append((low, p, rd[low][1], rd[low][2]))
    for r in RS:
        if rd[r][2] == "SEC" and r in ("dev", "qa"): secs.append((r, p))
    if "429" in (rd["admin"][0], rd["dev"][0]): rt += 1
    time.sleep(0.12)
print("=== FULL SWEEP %d GET endpoints x5 roles  (sens-leak/secret to low roles) ===" % len(EPS))
print("LEAK dev/qa on SENSITIVE prefix: %d" % len(leaks))
for low, p, ln, s in sorted(leaks): print("   [%s] %-44s %sB %s" % (low, p, ln, "!SEC" if s else ""))
print("SECRET-PATTERN visible to dev/qa: %d" % len(secs))
for r, p in sorted(set(secs)): print("   [%s] %s" % (r, p))
print("(429 throttled endpoints: %d - rerun if high)" % rt)
