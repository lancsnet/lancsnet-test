#!/bin/bash
sudo -u postgres psql -d vsp_go -t -A -c "
SELECT json_build_object(
  'total', COUNT(*), 'limit', 50, 'offset', 0,
  'users', json_agg(json_build_object(
    'id', id, 'email', email,
    'name', COALESCE(name, split_part(email,'@',1)),
    'role', role, 'status', status,
    'mfa_enabled', mfa_enabled,
    'last_login', last_login, 'created_at', created_at
  ) ORDER BY created_at DESC)
) FROM users WHERE tenant_id='216d1dff-cb14-4060-a3be-f261957c345e';" \
2>/dev/null | sudo tee /var/www/html/users_list.json > /dev/null
echo "Users cache updated: $(date)"
