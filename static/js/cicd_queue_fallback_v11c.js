/* CICD_QUEUE_FALLBACK_V11D_NO_QUEUE_PROBE
   Product mode: do NOT probe /api/v1/cicd/queue while backend route is unavailable.
   Use persisted scheduler config as queue/schedule state to avoid red 404 noise.
*/
(function(){
  if (window.__CICD_QUEUE_FALLBACK_V11D__) return;
  window.__CICD_QUEUE_FALLBACK_V11D__ = true;

  const API = {
    config: "/api/v1/cicd/config",
    status: "/api/v1/cicd/status"
  };

  window.__CICD_QUEUE_API_AVAILABLE__ = false;

  async function fetchJSON(url) {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
      credentials: "same-origin"
    });

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

    if (!res.ok) {
      throw Object.assign(new Error("HTTP " + res.status), { status: res.status, data });
    }

    return data;
  }

  async function loadQueueState() {
    let cfg = {};
    let st = {};

    try { cfg = await fetchJSON(API.config); } catch (_) {}
    try { st = await fetchJSON(API.status); } catch (_) {}

    const config = cfg.config || cfg || {};
    const scheduler = config.scheduler || {};
    const active = scheduler.enabled !== false;

    const synthetic = {
      rid: config.rid || "SCHEDULE_CONFIG",
      source: "scheduler-config",
      branch: scheduler.branch || "main",
      profile: scheduler.profile || config.profile || "commercial-full-gate",
      status: active ? "ACTIVE" : "PAUSED",
      owner: "DevSecOps",
      created_at: scheduler.updated_at || config.updated_at || "",
      note: "Scheduler configuration state. Queue API is disabled in product fallback mode."
    };

    window.__CICD_QUEUE_STATE_V11C__ = {
      ok: true,
      mode: "config-fallback",
      count: active ? 1 : 0,
      items: active ? [synthetic] : [],
      latest_status: st.latest_status || "n/a",
      source: "CICD_QUEUE_FALLBACK_V11D_NO_QUEUE_PROBE"
    };

    console.log("[CICD-QUEUE-FALLBACK-V11D] using config/status fallback; queue probe disabled", window.__CICD_QUEUE_STATE_V11C__);
    return window.__CICD_QUEUE_STATE_V11C__;
  }

  window.getCICDQueueState = loadQueueState;
  loadQueueState();
})();
