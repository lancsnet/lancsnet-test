#!/usr/bin/env python3
"""VSP Scanner Worker"""
import redis, json, subprocess, psycopg2, time, os, re, glob

DB_URL = os.environ.get("DATABASE_URL") or os.environ.get("VSP_DATABASE_URL") or ""
if not DB_URL:
    raise SystemExit("FATAL: DATABASE_URL not set; vsp-scanner.service phai nap .env qua EnvironmentFile")
TENANT_ID = "216d1dff-cb14-4060-a3be-f261957c345e"

def get_db():
    return psycopg2.connect(DB_URL)

def insert_finding(db, run_id, tool, severity, rule_id, message, path="", line=0, cwe=""):
    cur = db.cursor()
    cur.execute("""INSERT INTO findings (run_id,tenant_id,tool,severity,rule_id,message,path,line_num,cwe)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (run_id, TENANT_ID, tool, severity, rule_id, str(message)[:500], str(path)[:300], int(line or 0), (cwe or None)))
    db.commit()

def _extract_cwe(val):
    """Tra ve CWE-<n> dau tien tim thay trong val (str/list/dict id so), hoac ''."""
    if isinstance(val, dict):
        cid = val.get("id")
        if isinstance(cid, int) or (isinstance(cid, str) and cid.isdigit()):
            return "CWE-%s" % cid
        val = [val.get("id"), val.get("cwe"), val.get("name"), val.get("link")]
    items = [val] if isinstance(val, str) else (list(val) if isinstance(val,(list,tuple)) else [val])
    for it in items:
        if it is None: continue
        m = re.search(r"CWE[-_\s]?(\d+)", str(it), re.I)
        if m: return "CWE-" + m.group(1)
    return ""

def run_semgrep(target, run_id, db):
    print(f"  [semgrep] scanning...")
    try:
        r = subprocess.run(["semgrep","--config=/home/devsecops/vsp-platform-v4.9.0/config/semgrep_rules.yaml","--json","--quiet","--timeout","30","--max-target-bytes","1000000","--include","*.js","--include","*.ts","--include","*.go","--include","*.py",target],
            capture_output=True, text=True, timeout=180)
        data = json.loads(r.stdout or '{"results":[]}')
        count = 0
        for f in data.get("results",[]):
            sev = f.get("extra",{}).get("severity","INFO").upper()
            if sev == "WARNING": sev = "MEDIUM"
            insert_finding(db, run_id, "semgrep", sev,
                f.get("check_id",""), f.get("extra",{}).get("message",""),
                f.get("path",""), f.get("start",{}).get("line",0),
                cwe=_extract_cwe(f.get("extra",{}).get("metadata",{}).get("cwe","")))
            count += 1
        print(f"  [semgrep] {count} findings")
        return count
    except Exception as e:
        print(f"  [semgrep] error: {e}"); return 0

def run_trivy(target, run_id, db):
    print(f"  [trivy] scanning...")
    try:
        r = subprocess.run(["trivy","fs","--format=json","--quiet",target],
            capture_output=True, text=True, timeout=180)
        data = json.loads(r.stdout or '{"Results":[]}')
        count = 0
        for res in data.get("Results",[]):
            for v in res.get("Vulnerabilities",[]):
                sev = v.get("Severity","INFO").upper()
                insert_finding(db, run_id, "trivy", sev,
                    v.get("VulnerabilityID",""), (v.get("Title") or v.get("Description",""))[:200],
                    res.get("Target",""), 0,
                    cwe=_extract_cwe(v.get("CweIDs","")))
                count += 1
        print(f"  [trivy] {count} findings")
        return count
    except Exception as e:
        print(f"  [trivy] error: {e}"); return 0

def run_gitleaks(target, run_id, db):
    print(f"  [gitleaks] scanning...")
    try:
        subprocess.run(["gitleaks","detect","--source",target,
            "--report-format","json","--report-path","/tmp/gl_out.json","--no-git"],
            capture_output=True, timeout=60)
        try:
            data = json.load(open("/tmp/gl_out.json"))
        except:
            data = []
        count = 0
        for f in (data if isinstance(data,list) else []):
            insert_finding(db, run_id, "gitleaks", "HIGH",
                f.get("RuleID","secret"), f.get("Description","Secret detected"),
                f.get("File",""), f.get("StartLine",0))
            count += 1
        print(f"  [gitleaks] {count} findings")
        return count
    except Exception as e:
        print(f"  [gitleaks] error: {e}"); return 0

def run_kics(target, run_id, db):
    print(f"  [kics] scanning...")
    try:
        os.makedirs("/tmp/kics_out", exist_ok=True)
        subprocess.run(["kics","scan","-p",target,"-o","/tmp/kics_out",
            "--report-formats","json","--silent"],
            capture_output=True, timeout=120)
        count = 0
        for f in glob.glob("/tmp/kics_out/*.json"):
            try:
                data = json.load(open(f))
                for q in data.get("queries",[]):
                    sev = q.get("severity","INFO").upper()
                    for fi in q.get("files",[]):
                        insert_finding(db, run_id, "kics", sev,
                            q.get("query_id",""), q.get("query_name",""),
                            fi.get("file_name",""), fi.get("line",0))
                        count += 1
            except: pass
        print(f"  [kics] {count} findings")
        return count
    except Exception as e:
        print(f"  [kics] error: {e}"); return 0

def run_checkov(target, run_id, db):
    print(f"  [checkov] scanning...")
    try:
        r = subprocess.run(["checkov","-d",target,"-o","json","--quiet","--compact"],
            capture_output=True, text=True, timeout=180)
        count = 0
        try:
            data = json.loads(r.stdout or '{}')
            results = data if isinstance(data,list) else [data]
            for res in results:
                for c in res.get("results",{}).get("failed_checks",[]):
                    insert_finding(db, run_id, "checkov", "MEDIUM",
                        c.get("check_id",""), c.get("check_type","IaC issue"),
                        c.get("repo_file_path",""), 0)
                    count += 1
        except: pass
        print(f"  [checkov] {count} findings")
        return count
    except Exception as e:
        print(f"  [checkov] error: {e}"); return 0

def run_gosec(target, run_id, db):
    print(f"  [gosec] scanning...")
    try:
        r = subprocess.run(["gosec","-fmt=json","-quiet","./..."],
            capture_output=True, text=True, timeout=120,
            cwd=target if os.path.isdir(target) else ".")
        data = json.loads(r.stdout or '{"Issues":[]}')
        count = 0
        for i in data.get("Issues",[]):
            sev = i.get("severity","LOW").upper()
            insert_finding(db, run_id, "gosec", sev,
                i.get("rule_id",""), i.get("details",""),
                i.get("file",""), int(i.get("line",0) or 0))
            count += 1
        print(f"  [gosec] {count} findings")
        return count
    except Exception as e:
        print(f"  [gosec] error: {e}"); return 0

def evaluate_gate(db, run_id):
    cur = db.cursor()
    cur.execute("SELECT severity, COUNT(*) FROM findings WHERE run_id=%s GROUP BY severity", (run_id,))
    counts = {r[0]: r[1] for r in cur.fetchall()}
    summary = {"critical":counts.get("CRITICAL",0),"high":counts.get("HIGH",0),
               "medium":counts.get("MEDIUM",0),"low":counts.get("LOW",0)}
    gate = "FAIL" if counts.get("CRITICAL",0) > 0 else "PASS"
    posture = "CRITICAL" if counts.get("CRITICAL",0)>0 else ("ELEVATED" if counts.get("HIGH",0)>0 else "GOOD")
    _c=summary["critical"]; _h=summary["high"]; _m=summary["medium"]; _l=summary["low"]
    _score=int(max(0,min(100,round(100-_c*25-_h*8-_m*2-_l*0.5))))
    if _c>0: _score=min(_score,59)
    _grade="A" if _score>=80 else "B" if _score>=70 else "C" if _score>=60 else "D" if _score>=40 else "F"
    summary["SCORE"]=_score; summary["GRADE"]=_grade; summary["POSTURE_LABEL"]=posture
    posture=_grade
    return gate, posture, summary

def run_codeql(target, run_id, db):
    print(f"  [codeql] scanning...")
    try:
        import tempfile, shutil
        db_path = tempfile.mkdtemp()
        # Create codeql database
        subprocess.run(
            ["codeql", "database", "create", db_path,
             "--language=javascript", "--source-root", target,
             "--overwrite", "--quiet"],
            capture_output=True, timeout=300)
        # Run analysis
        result = subprocess.run(
            ["codeql", "database", "analyze", db_path,
             "--format=sarif-latest", "--output=/tmp/codeql_results.sarif",
             "--quiet"],
            capture_output=True, text=True, timeout=300)
        import json as _j
        count = 0
        try:
            sarif = _j.load(open("/tmp/codeql_results.sarif"))
            for run in sarif.get("runs", []):
                for r in run.get("results", []):
                    sev = r.get("level", "warning").upper()
                    if sev == "WARNING": sev = "MEDIUM"
                    elif sev == "ERROR": sev = "HIGH"
                    locs = r.get("locations", [{}])
                    path = locs[0].get("physicalLocation", {}).get("artifactLocation", {}).get("uri", "")
                    line = locs[0].get("physicalLocation", {}).get("region", {}).get("startLine", 0)
                    insert_finding(db, run_id, "codeql", sev,
                        r.get("ruleId", ""), r.get("message", {}).get("text", ""),
                        path, line)
                    count += 1
        except: pass
        shutil.rmtree(db_path, ignore_errors=True)
        print(f"  [codeql] {count} findings")
        return count
    except Exception as e:
        print(f"  [codeql] error: {e}"); return 0

def run_bandit(target, run_id, db):
    print(f"  [bandit] scanning...")
    try:
        r = subprocess.run(["bandit","-r",target,"-f","json","-q"],
            capture_output=True, text=True, timeout=120)
        data = json.loads(r.stdout or '{"results":[]}')
        count = 0
        for i in data.get("results",[]):
            sev = i.get("issue_severity","LOW").upper()
            insert_finding(db, run_id, "bandit", sev,
                i.get("test_id",""), i.get("issue_text",""),
                i.get("filename",""), i.get("line_number",0),
                cwe=_extract_cwe(i.get("issue_cwe","")))
            count += 1
        print(f"  [bandit] {count} findings"); return count
    except Exception as e:
        print(f"  [bandit] error: {e}"); return 0

def run_hadolint(target, run_id, db):
    print(f"  [hadolint] scanning...")
    try:
        import glob as _g
        dockerfiles = _g.glob(f"{target}/**/Dockerfile*", recursive=True)
        count = 0
        for df in dockerfiles:
            r = subprocess.run(["hadolint","--format","json", df],
                capture_output=True, text=True, timeout=60)
            try:
                data = json.loads(r.stdout or "[]")
                for i in (data if isinstance(data,list) else []):
                    sev = i.get("level","info").upper()
                    if sev == "WARNING": sev = "MEDIUM"
                    elif sev == "ERROR": sev = "HIGH"
                    insert_finding(db, run_id, "hadolint", sev,
                        i.get("code",""), i.get("message",""), df, i.get("line",0))
                    count += 1
            except: pass
        print(f"  [hadolint] {count} findings"); return count
    except Exception as e:
        print(f"  [hadolint] error: {e}"); return 0

def run_grype(target, run_id, db):
    print(f"  [grype] scanning...")
    try:
        r = subprocess.run(["grype","dir:"+target,"-o","json","--quiet"],
            capture_output=True, text=True, timeout=180)
        data = json.loads(r.stdout or '{"matches":[]}')
        count = 0
        for m in data.get("matches",[]):
            vuln = m.get("vulnerability",{})
            sev = vuln.get("severity","Unknown").upper()
            insert_finding(db, run_id, "grype", sev,
                vuln.get("id",""), vuln.get("description","")[:200],
                m.get("artifact",{}).get("locations",[{}])[0].get("path",""), 0)
            count += 1
        print(f"  [grype] {count} findings"); return count
    except Exception as e:
        print(f"  [grype] error: {e}"); return 0

def run_syft(target, run_id, db):
    print(f"  [syft] scanning...")
    try:
        r = subprocess.run(["syft","dir:"+target,"-o","json","--quiet"],
            capture_output=True, text=True, timeout=120)
        data = json.loads(r.stdout or '{"artifacts":[]}')
        count = len(data.get("artifacts",[]))
        print(f"  [syft] {count} packages (SBOM, no findings)"); return 0
    except Exception as e:
        print(f"  [syft] error: {e}"); return 0

def run_retire(target, run_id, db):
    print(f"  [retire] scanning...")
    try:
        r = subprocess.run(["retire","--path",target,"--outputformat","json","--exitwith","0"],
            capture_output=True, text=True, timeout=120, cwd=target)
        count = 0
        try:
            data = json.loads(r.stdout or '{"data":[]}')
            for item in data.get("data",[]):
                for result in item.get("results",[]):
                    for vuln in result.get("vulnerabilities",[]):
                        sev = vuln.get("severity","medium").upper()
                        insert_finding(db, run_id, "retire", sev,
                            vuln.get("identifiers",{}).get("CVE",[""])[0],
                            vuln.get("info",[""])[0][:200],
                            item.get("file",""), 0)
                        count += 1
        except: pass
        print(f"  [retire] {count} findings"); return count
    except Exception as e:
        print(f"  [retire] error: {e}"); return 0

def run_license_finder(target, run_id, db):
    print(f"  [license_finder] scanning...")
    try:
        r = subprocess.run(["license_finder","--quiet"],
            capture_output=True, text=True, timeout=120, cwd=target)
        count = 0
        for line in r.stdout.splitlines():
            if line.strip():
                insert_finding(db, run_id, "license", "INFO",
                    "license-check", line.strip(), "", 0)
                count += 1
        print(f"  [license_finder] {count} findings"); return count
    except Exception as e:
        print(f"  [license_finder] error: {e}"); return 0

def run_nuclei(target, run_id, db):
    print(f"  [nuclei] scanning...")
    if not str(target).startswith(("http://", "https://")):
        print("  [nuclei] skipped (khong co http/https target)"); return 0
    try:
        _u = target if str(target).startswith(("http://","https://")) else f"https://{target}"
        r = subprocess.run(["nuclei","-u",_u,
            "-j","-silent","-severity","medium,high,critical",
            "-rl","20","-c","10","-timeout","8",
            "-exclude-tags","intrusive,dos,fuzz","-disable-update-check"],
            capture_output=True, text=True, timeout=300)
        count = 0
        for line in r.stdout.splitlines():
            try:
                d = json.loads(line)
                sev = d.get("info",{}).get("severity","info").upper()
                insert_finding(db, run_id, "nuclei", sev,
                    d.get("template-id",""), d.get("info",{}).get("name",""),
                    d.get("matched-at",""), 0)
                count += 1
            except: pass
        print(f"  [nuclei] {count} findings"); return count
    except Exception as e:
        print(f"  [nuclei] error: {e}"); return 0

def run_nikto(target, run_id, db):
    print(f"  [nikto] scanning...")
    try:
        _h = target if str(target).startswith(("http://","https://")) else f"https://{target}"
        r = subprocess.run(["nikto","-h",_h,"-Format","json","-o","/tmp/nikto.json","-nointeractive","-maxtime","120s"],
            capture_output=True, text=True, timeout=300)
        count = 0
        try:
            data = json.loads(open("/tmp/nikto.json").read())
            for vuln in data.get("vulnerabilities",[]):
                insert_finding(db, run_id, "nikto", "MEDIUM",
                    vuln.get("id",""), vuln.get("msg",""),
                    vuln.get("url",""), 0)
                count += 1
        except: pass
        print(f"  [nikto] {count} findings"); return count
    except Exception as e:
        print(f"  [nikto] error: {e}"); return 0

def run_nmap(target, run_id, db):
    print(f"  [nmap] scanning {target}...")
    try:
        nmap_target = target if target not in ('.', '') else 'localhost'
        # Network scan: discover hosts + open ports + service version
        r = subprocess.run([
            "sudo", "nmap", "-sV", "--open", "-T3",
            "--host-timeout", "300s", "--script", "default",
            "-oX", "/tmp/nmap.xml", nmap_target
        ], capture_output=True, text=True, timeout=600)
        count = 0
        try:
            import xml.etree.ElementTree as ET
            tree = ET.parse("/tmp/nmap.xml")
            # Report open ports as findings
            for host in tree.findall(".//host"):
                addr = host.find(".//address[@addrtype='ipv4']")
                ip = addr.get("addr","") if addr is not None else "unknown"
                for port in host.findall(".//port"):
                    state = port.find("state")
                    if state is None or state.get("state") != "open": continue
                    svc = port.find("service")
                    portid = port.get("portid","")
                    svcname = svc.get("name","") if svc is not None else ""
                    product = svc.get("product","") if svc is not None else ""
                    sev = "HIGH" if portid in ("22","23","3389","445","139") else "MEDIUM" if portid in ("80","443","8080","8443") else "LOW"
                    msg = f"Open port {portid}/{svcname} on {ip} ({product})"
                    insert_finding(db, run_id, "nmap", sev, f"open-port-{portid}", msg, ip, 0)
                    count += 1
                # Check vuln scripts
                for script in host.findall(".//script[@id]"):
                    if "VULNERABLE" in (script.get("output","") or ""):
                        insert_finding(db, run_id, "nmap", "HIGH",
                            script.get("id",""), script.get("output","")[:200], ip, 0)
                        count += 1
        except Exception as ex:
            print(f"  [nmap] parse error: {ex}")
        print(f"  [nmap] {count} findings"); return count
    except Exception as e:
        print(f"  [nmap] error: {e}"); return 0

def run_sslscan(target, run_id, db):
    print(f"  [sslscan] scanning...")
    try:
        _hp = re.sub(r"^https?://","",str(target)).rstrip("/")
        if ":" not in _hp: _hp += ":443"
        r = subprocess.run(["sslscan","--no-colour",_hp], capture_output=True, text=True, timeout=90)
        count = 0
        for _ln in r.stdout.splitlines():
            _l = _ln.strip()
            for _p,_sev in (("SSLv2","HIGH"),("SSLv3","HIGH"),("TLSv1.0","MEDIUM"),("TLSv1.1","MEDIUM")):
                if _l.startswith(_p) and "enabled" in _l.lower():
                    insert_finding(db, run_id, "sslscan", _sev, "weak-tls-proto", _l[:160], _hp, 0); count += 1
        print(f"  [sslscan] {count} findings"); return count
    except Exception as e:
        print(f"  [sslscan] error: {e}"); return 0


def run_trufflehog(target, run_id, db):
    print(f"  [trufflehog] scanning...")
    try:
        r = subprocess.run(
            ["trufflehog", "filesystem", target, "--json", "--no-update"],
            capture_output=True, text=True, timeout=120)
        count = 0
        for line in r.stdout.splitlines():
            try:
                d = json.loads(line)
                insert_finding(db, run_id, "trufflehog", "HIGH",
                    d.get("DetectorName","secret"),
                    f"Secret detected: {d.get('DetectorName','')}",
                    d.get("SourceMetadata",{}).get("Data",{}).get("Filesystem",{}).get("file",""), 0)
                count += 1
            except: pass
        print(f"  [trufflehog] {count} findings"); return count
    except Exception as e:
        print(f"  [trufflehog] error: {e}"); return 0

def run_govulncheck(target, run_id, db):
    print(f"  [govulncheck] scanning...")
    try:
        r = subprocess.run(
            ["govulncheck", "-json", "./..."],
            capture_output=True, text=True, timeout=120,
            cwd=target if os.path.isdir(target) else ".")
        count = 0
        for line in r.stdout.splitlines():
            try:
                d = json.loads(line)
                if d.get("finding"):
                    f = d["finding"]
                    insert_finding(db, run_id, "govulncheck", "HIGH",
                        f.get("osv",""), f.get("osv",""),
                        "", 0)
                    count += 1
            except: pass
        print(f"  [govulncheck] {count} findings"); return count
    except Exception as e:
        print(f"  [govulncheck] error: {e}"); return 0

def run_osv_scanner(target, run_id, db):
    print(f"  [osv-scanner] scanning...")
    try:
        r = subprocess.run(
            ["osv-scanner", "--format=json", "--recursive", target],
            capture_output=True, text=True, timeout=120)
        count = 0
        try:
            data = json.loads(r.stdout or '{}')
            for result in data.get("results", []):
                for pkg in result.get("packages", []):
                    for vuln in pkg.get("vulnerabilities", []):
                        insert_finding(db, run_id, "osv-scanner", "HIGH",
                            vuln.get("id",""), vuln.get("summary","")[:200],
                            pkg.get("package",{}).get("name",""), 0)
                        count += 1
        except: pass
        print(f"  [osv-scanner] {count} findings"); return count
    except Exception as e:
        print(f"  [osv-scanner] error: {e}"); return 0

def run_cosign_verify(target, run_id, db):
    print(f"  [cosign] skipped (POC: registry auth not available)")
    return 0
    try:
        # Verify supply chain signatures
        r = subprocess.run(
            ["cosign", "verify",
             "--certificate-identity-regexp", ".*chainguard.*",
             "--certificate-oidc-issuer-regexp", ".*",
             "cgr.dev/chainguard/alpine:latest"],
            capture_output=True, text=True, timeout=30)
        if r.returncode != 0:
            insert_finding(db, run_id, "cosign", "MEDIUM",
                "unsigned-image", "Image signature verification failed",
                "cgr.dev/chainguard/alpine:latest", 0)
            print(f"  [cosign] 1 finding (unverified image)"); return 1
        print(f"  [cosign] 0 findings"); return 0
    except Exception as e:
        print(f"  [cosign] error: {e}"); return 0

def run_gofuzz(target, run_id, db):
    print(f"  [gofuzz] checking...")
    try:
        # Check Go fuzz targets exist
        r = subprocess.run(
            ["grep", "-r", "func Fuzz", target, "--include=*.go", "-l"],
            capture_output=True, text=True, timeout=30)
        count = len(r.stdout.splitlines())
        if count > 0:
            insert_finding(db, run_id, "gofuzz", "INFO",
                "fuzz-targets-found", f"Found {count} fuzz test files",
                target, 0)
        print(f"  [gofuzz] {count} fuzz targets found"); return 0
    except Exception as e:
        print(f"  [gofuzz] error: {e}"); return 0

def run_racedetect(target, run_id, db):
    print(f"  [racedetect] checking...")
    try:
        r = subprocess.run(
            ["go", "build", "-race", "./..."],
            capture_output=True, text=True, timeout=120,
            cwd=target if os.path.isdir(target) else ".")
        count = 0
        if "DATA RACE" in r.stdout or "DATA RACE" in r.stderr:
            insert_finding(db, run_id, "racedetect", "HIGH",
                "data-race", "Data race detected", target, 0)
            count = 1
        print(f"  [racedetect] {count} findings"); return count
    except Exception as e:
        print(f"  [racedetect] error: {e}"); return 0


def run_secretcheck(target, run_id, db):
    print(f"  [secretcheck] scanning...")
    try:
        import os
        scan_path = target if target not in ('', 'localhost') else '.'
        if str(scan_path).startswith(("http://", "https://")):
            scan_path = '.'
        ds_bin = "/home/devsecops/.local/bin/detect-secrets"
        if not os.path.exists(ds_bin):
            ds_bin = "detect-secrets"
        if os.path.isdir(scan_path):
            _wd, _arg = scan_path, "."
        else:
            _wd, _arg = None, scan_path
        r = subprocess.run([ds_bin, "scan", "--all-files", _arg], cwd=_wd,
            capture_output=True, text=True, timeout=180)
        count = 0
        try:
            data = json.loads(r.stdout) if r.stdout.strip() else {}
        except Exception:
            data = {}
        for fname, items in (data.get("results", {}) or {}).items():
            for it in (items or []):
                stype = it.get("type", "secret")
                insert_finding(db, run_id, "secretcheck", "HIGH",
                    stype, f"Potential hardcoded secret: {stype}",
                    fname, it.get("line_number", 0), cwe="CWE-798")
                count += 1
        print(f"  [secretcheck] {count} findings")
        return count
    except Exception as e:
        print(f"  [secretcheck] error: {e}"); return 0


def run_appsec(target, run_id, db):
    print(f"  [appsec] scanning...")
    if not str(target).startswith(("http://", "https://")):
        print("  [appsec] skipped (khong co http/https target)"); return 0
    try:
        _u = target if str(target).startswith(("http://", "https://")) else f"https://{target}"
        r = subprocess.run(["nuclei", "-u", _u,
            "-j", "-silent",
            "-tags", "xss,sqli,lfi,rce,ssrf,exposure,misconfig,auth-bypass,default-login",
            "-severity", "low,medium,high,critical",
            "-rl", "20", "-c", "10", "-timeout", "8",
            "-exclude-tags", "intrusive,dos,fuzz", "-disable-update-check"],
            capture_output=True, text=True, timeout=300)
        count = 0
        for line in r.stdout.splitlines():
            try:
                d = json.loads(line)
                sev = d.get("info", {}).get("severity", "info").upper()
                tags = d.get("info", {}).get("tags", []) or []
                tl = ",".join(tags) if isinstance(tags, list) else str(tags)
                cwe = ""
                if "sqli" in tl: cwe = "CWE-89"
                elif "xss" in tl: cwe = "CWE-79"
                elif "lfi" in tl: cwe = "CWE-22"
                elif "ssrf" in tl: cwe = "CWE-918"
                elif "rce" in tl: cwe = "CWE-94"
                elif "default-login" in tl or "auth-bypass" in tl: cwe = "CWE-287"
                elif "exposure" in tl or "misconfig" in tl: cwe = "CWE-200"
                insert_finding(db, run_id, "appsec", sev,
                    d.get("template-id", ""), d.get("info", {}).get("name", ""),
                    d.get("matched-at", ""), 0, cwe=cwe)
                count += 1
            except Exception:
                pass
        print(f"  [appsec] {count} findings")
        return count
    except Exception as e:
        print(f"  [appsec] error: {e}"); return 0


def run_netcat(target, run_id, db):
    print(f"  [netcat] scanning...")
    try:
        host = target if target not in ('.', '', 'localhost') else '127.0.0.1'
        if str(host).startswith(("http://", "https://")):
            host = re.sub(r'^https?://', '', host).split('/')[0].split(':')[0]
        ports = {21: "ftp", 22: "ssh", 23: "telnet", 25: "smtp", 80: "http",
                 110: "pop3", 139: "netbios", 143: "imap", 443: "https", 445: "smb",
                 1433: "mssql", 3306: "mysql", 3389: "rdp", 5432: "postgres",
                 5900: "vnc", 6379: "redis", 8080: "http-alt", 9200: "elastic",
                 11211: "memcached", 27017: "mongodb"}
        cleartext = {21, 23, 25, 80, 110, 143, 8080}
        high_risk = {23, 445, 3389, 3306, 5432, 6379, 9200, 11211, 27017, 1433, 5900}
        count = 0
        for port, svc in ports.items():
            try:
                rc = subprocess.run(["nc", "-z", "-w", "2", host, str(port)],
                    capture_output=True, timeout=5).returncode
            except Exception:
                continue
            if rc != 0:
                continue
            banner = ""
            try:
                b = subprocess.run(["nc", "-w", "2", host, str(port)],
                    input=b"\r\n", capture_output=True, timeout=4)
                if b.stdout:
                    lines = b.stdout.decode(errors="replace").strip().splitlines()
                    banner = lines[0][:120] if lines else ""
            except Exception:
                banner = ""
            sev = "HIGH" if port in high_risk else ("MEDIUM" if port in cleartext else "LOW")
            cwe = "CWE-319" if port in cleartext else "CWE-200"
            msg = f"Open port {port}/{svc} on {host}" + (f" - banner: {banner}" if banner else "")
            insert_finding(db, run_id, "netcat", sev,
                f"open-port-{port}", msg, host, 0, cwe=cwe)
            count += 1
        print(f"  [netcat] {count} findings")
        return count
    except Exception as e:
        print(f"  [netcat] error: {e}"); return 0


def process_task(msg, r):
    raw = msg.decode(errors='replace')
    m = re.search(r'\{[^{}]+\}', raw)
    if not m: return
    payload = json.loads(m.group())

    rid = payload.get("rid","")
    run_id = payload.get("run_id","")
    src = payload.get("src",".") or "."
    mode = payload.get("mode","QUICK")

    db = get_db()
    if not run_id:
        cur = db.cursor()
        cur.execute("SELECT id FROM runs WHERE rid=%s", (rid,))
        row = cur.fetchone()
        if not row: print(f"  [error] run not found: {rid}"); db.close(); return
        run_id = str(row[0])

    print(f"\n{'='*50}\nProcessing: {rid}\nrun_id={run_id} src={src} mode={mode}")

    cur = db.cursor()
    tools_count = 26  # Total tools in scanner
    cur.execute("UPDATE runs SET status='RUNNING',started_at=NOW(),tools_done=0,tools_total=%s WHERE id=%s", (tools_count, run_id,))
    # Xóa findings cũ của run này nếu có (retry case)
    cur.execute("DELETE FROM findings WHERE run_id=%s", (run_id,))
    db.commit()

    # NETWORK mode: dùng target_url/target là IP/CIDR
    net_target = payload.get("target_url", payload.get("target", ""))
    if net_target.startswith("http://") or net_target.startswith("https://"):
        net_target = re.sub(r'^https?://', '', net_target)
    if mode in ("NETWORK", "NETWORK_L2L7", "NETWORK — L2-L7"):
        target = net_target if net_target else "localhost"
    elif mode == "DAST":
        target = payload.get("target_url") or payload.get("target") or "https://127.0.0.1:30800"
    else:
        target = src if src != "localhost" else "."
    total = 0
    if mode in ("NETWORK", "NETWORK_L2L7", "NETWORK — L2-L7"):
        tools = [run_nmap, run_sslscan, run_netcat]
    elif mode in ("SAST", "QUICK"):
        tools = [run_semgrep, run_gosec, run_bandit, run_gitleaks]
    elif mode == "SCA":
        tools = [run_trivy, run_grype, run_syft, run_govulncheck, run_osv_scanner]
    elif mode == "IAC":
        tools = [run_kics, run_checkov, run_hadolint]
    elif mode == "DAST":
        tools = [run_nuclei, run_nikto, run_appsec]
    elif mode == "SECRETS":
        tools = [run_gitleaks, run_trufflehog, run_secretcheck]
    else:
        tools = [
        run_semgrep, run_trivy, run_gitleaks, run_kics, run_checkov,
        run_gosec, run_codeql, run_bandit, run_hadolint, run_grype,
        run_syft, run_retire, run_license_finder, run_nuclei,
        run_nikto, run_nmap, run_sslscan, run_trufflehog,
        run_govulncheck, run_osv_scanner, run_cosign_verify,
        run_gofuzz, run_racedetect,
        run_secretcheck, run_appsec, run_netcat
    ]
    # Update tools_total với số tools thực tế
    cur.execute("UPDATE runs SET tools_total=%s WHERE id=%s", (len(tools), run_id)); db.commit()
    for i, tool_fn in enumerate(tools, 1):
        total += tool_fn(target, run_id, db)
        cur.execute("UPDATE runs SET tools_done=%s WHERE id=%s", (i, run_id)); db.commit()

    gate, posture, summary = evaluate_gate(db, run_id)
    cur.execute("""UPDATE runs SET status='PASS',finished_at=NOW(),
        tools_done=%s,total_findings=%s,summary=%s,gate=%s,posture=%s,
        triggered_by='manual',policy_version='v1' WHERE id=%s""",
        (len(tools), total, json.dumps(summary), gate, posture, run_id))
    db.commit()
    print(f"  DONE: {total} findings gate={gate} posture={posture}")
    db.close()

def main():
    print("VSP Scanner Worker starting...")
    r = redis.Redis(host="127.0.0.1")
    print("Watching asynq:{default}:pending")
    while True:
        try:
            item = r.rpoplpush("asynq:{default}:pending","asynq:{default}:active")
            if item:
                task_id = item.decode().strip()
                msg = r.hget(f"asynq:{{default}}:t:{task_id}", "msg")
                if msg:
                    process_task(msg, r)
                    r.lrem("asynq:{default}:active", 1, task_id)
                    r.delete(f"asynq:{{default}}:t:{task_id}")
            else:
                time.sleep(2)
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}"); time.sleep(5)

if __name__ == "__main__":
    main()
