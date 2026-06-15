import shutil, time, sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
lines = open(P).read().split("\n")
start = None
for i, l in enumerate(lines):
    if l.strip() == "location = /api/p4/ato/expiry {":
        start = i; break
if start is None:
    print("not found (maybe already removed)"); sys.exit(0)
end = None
for i in range(start + 1, len(lines)):
    if lines[i].strip() == "}":
        end = i; break
if end is None:
    print("ERR: closing brace not found"); sys.exit(1)
print("Removing lines %d-%d:" % (start + 1, end + 1))
for l in lines[start:end + 1]:
    print("  | " + (l[:90] + ("..." if len(l) > 90 else "")))
shutil.copy(P, P + ".bak5." + str(int(time.time())))
del lines[start:end + 1]
open(P, "w").write("\n".join(lines))
print("OK removed mock block (%d lines)" % (end - start + 1))
