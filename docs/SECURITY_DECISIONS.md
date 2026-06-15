
## SD-0001 — Fix ConMon schedule creation forbidden error

**Date:** 2026-06-04
**Who:** devsecops (admin@lancs.local)

### Vấn đề
`POST /api/v1/conmon/schedules` trả `403 forbidden` dù token hợp lệ.

### Root cause
1. User `admin@lancs.local` có role `superadmin` — gateway dùng
   `RequireRole("admin")` cho ConMon endpoint, không nhận `superadmin`.
2. Tenant `subscription_status = 'inactive'` — đã fix trước đó.
3. Bug phụ: gateway trả `403` thay vì `400` khi thiếu field `target_path`.

### Fix
- Đổi role `superadmin` → `admin` cho user `admin@lancs.local` (DB update).
- Update `subscription_status` → `active` cho tenant LANCS.
- Xóa 4 rows đã bypass DB trực tiếp (id 1-4), tạo lại đúng qua API (id 6-9).

### Schedules đã tạo
| ID | Name | Cadence | Target |
|----|------|---------|--------|
| 6 | FedRAMP 30-Day Scan | 30d | lancsnet-group/Lancsnet-project |
| 7 | FedRAMP 60-Day Review | 60d | lancsnet-group/Lancsnet-project |
| 8 | FedRAMP 90-Day Assessment | 90d | lancsnet-group/Lancsnet-project |
| 9 | CMMC Monthly Scan | 30d | lancsnet/lancsnet-test |

### Cần follow-up
- [ ] Báo owner `quynhanh1706vp-byte`: bug `403` thay vì `400` khi thiếu `target_path`
- [ ] Kiểm tra các user khác có role `superadmin` không — nếu có thì cũng bị lock
- [ ] Xem xét `superadmin` có nên được map vào `admin` trong gateway không
