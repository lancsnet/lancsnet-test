# CHANGES — VSP Platform v4.9.0

## Release Date: 2026-06-15

---

## 1. Core Platform

- `VERSION.json` — version bump to 4.9.0
- `install.sh` — updated install procedure
- `start_vsp.sh` — startup script updated

## 2. Backend / API

- `bin/vsp-scan-api.py` — scan API core update
- `bin/vsp-scanner.py` — scanner engine update
- `bin/vsp-scanner` — compiled scanner binary
- `bin/vsp-cwpp-api.py` — CWPP API added
- `bin/vsp-netflow-api.py` — NetFlow API added
- `bin/vsp-netflow-collector.py` — NetFlow collector added
- `bin/vsp-siem-api.py` — SIEM API added
- `bin/vsp-ueba-api.py` — UEBA API added
- `bin/auto_remediate.sh` — auto remediation script
- `bin/incident_detail_proxy.py` — incident proxy added
- `bin/scan_watcher.sh` — scan watcher added

## 3. Frontend / UI

### Static
- `static/index.html` — main UI entry point
- `static/landing.html` — landing page
- `static/favicon.ico` — favicon

### JavaScript
- `static/js/vsp_sbom_unified.js` — SBOM unified panel
- `static/js/vsp_prelogin_api_guard_v29.js` — pre-login API guard
- `static/js/vsp_pro_100.js` — Pro tier features
- `static/js/vsp_pro_cwpp_realapi.js` — CWPP real API integration
- `static/js/vsp_pro_supplychain_realapi.js` — Supply chain real API
- `static/js/vsp_scheduler_panel.js` — scheduler panel
- `static/js/vsp_sw_inventory_panel.js` — software inventory panel
- `static/js/vsp_upgrade_v100.js` — upgrade pathway v1.0.0
- `static/js/vsp_uxstates.js` — UX state management
- `static/js/vsp_h3_upgrade.js` — H3 upgrade module
- `static/js/vsp_fe_sync_patch_v2.js` — frontend sync patch v2
- `static/js/vsp_dast_panel.js` — DAST panel
- `static/js/vsp_email_panel.js` — email notification panel
- `static/js/vsp_bulk_f1.js` — bulk operations
- `static/js/vsp_sprint2_quickwins.js` — sprint 2 quick wins
- `static/js/vsp-actions.js` — action handlers
- `static/js/vsp_iframe_bootstrap.js` — iframe bootstrap
- `static/js/dom-safe.js` — DOM safety helpers
- `static/js/threat_hunting_enterprise_v1.js` — threat hunting enterprise
- `static/js/vuln_mgmt_enterprise_v1.js` — vulnerability management enterprise
- `static/js/network_flow_clean_enterprise_v3.js` — network flow enterprise
- `static/js/chart.umd.js` / `chart.umd.min.js` — Chart.js bundled

### CICD JS/CSS (enterprise suite)
- `static/js/cicd_*.js` — full CI/CD enterprise UI suite
- `static/css/cicd_*.css` — full CI/CD enterprise CSS suite

### Panels
- `static/panels/*.html` — all platform panels (SBOM, CSPM, CMMC, OSCAL, SOAR, UEBA, etc.)

### CSS / Fonts
- `static/vsp_enterprise_navy_theme.css` — enterprise navy theme
- `static/vsp_enterprise_ui.css` — enterprise UI base
- `static/css/tabler-icons.min.css` — Tabler icons
- `static/fonts/tabler-icons.*` — Tabler icon fonts

## 4. Configuration

- `config/config.yaml` — main platform config
- `config/autofix_policy.yaml` — autofix policy
- `config/nginx_vsp.conf` — nginx config
- `config/prometheus_rules.yml` — Prometheus alerting rules
- `config/semgrep_rules.yaml` — Semgrep SAST rules
- `config/tool_config.json` — tool configuration
- `nginx.vsp.final.conf` — final nginx config

## 5. Database Migrations

- `migrations/001_init.sql` through `migrations/046_users_rls.sql`
- `migrations/20260504_*.sql` — May 2026 migrations
- `migrations/h3*_*.sql` — H3 sprint migrations
- `migrations/siem_tables.sql` — SIEM tables

## 6. Documentation

- `docs/ARCHITECTURE.md` — platform architecture
- `docs/ONBOARDING.md` — onboarding guide
- `docs/RUNBOOK.md` — operational runbook
- `docs/SECURITY_DECISIONS.md` — security decision log
- `docs/TESTING.md` — testing guide
- `docs/VULNERABILITY_DISCLOSURE_POLICY.md` — VDP
- `docs/VSP-Datasheet-EN.pdf` / `docs/VSP-Datasheet-VN.pdf` — datasheets

## 7. Systemd / Infrastructure

- `systemd-overrides/cicd-role-check.10-jwtsecret.conf`
- `systemd-overrides/vsp-audit-gate.10-jwtsecret.conf`

## 8. Security & Compliance

- `.gitignore` — updated, excludes secrets
- `.gitleaks.toml` — gitleaks config
- `static/.well-known/security.txt` — security contact

## 9. Handover Package

- `_handover_20260614/` — full handover package (bin, systemd configs)

---

## Excluded (secrets — never pushed)
- `.env` — environment secrets
- `_quarantine_static/` — quarantined files with embedded credentials

