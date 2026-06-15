import shutil, time, sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
shutil.copy(P, P + ".bak_rl_" + time.strftime("%H%M%S"))
src = open(P).read()
marker = "    location /api/v1/vsp/findings {\n"
n = src.count(marker)
if n != 1:
    sys.exit("ABORT: marker count=%d (expected 1)" % n)
after = src.split(marker, 1)[1][:220]
if "limit_req" in after:
    sys.exit("ABORT: limit_req da co trong block findings")
ins = '        limit_req zone=api_analyst burst=10 nodelay;\n        limit_req_status 429;\n        add_header X-RateLimit-Limit "10" always;\n'
src = src.replace(marker, marker + ins, 1)
open(P, "w").write(src)
print("OK: inserted findings rate-limit (api_analyst 10r/s by IP)")
