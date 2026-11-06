import { useState } from "react";
import { useStore } from "../../context/StoreContext";
import { api } from "../../services/api";
import PageHead from "../../components/PageHead";
import DataTable from "../../components/DataTable";
import Badge from "../../components/Badge";
import SubNav from "../../components/SubNav";

const FLOW = [
  "The booking arrives through the partner's API or real-time webhook notification.",
  "StayFlow validates credentials, deduplicates channel_ref, and auto-assigns an available room.",
  "Local room inventory is immediately blocked and reservation status is set to Confirmed.",
  "Updated room availability is pushed to all other connected OTA channels to prevent double-booking.",
  "Periodic background sync runs every 2 minutes as a safeguard against dropped webhook events.",
];

const PRESET_CHANNELS = ["MakeMyTrip", "Agoda", "Booking.com", "Expedia"];

const CHANNEL_FIELDS = {
  agoda: [
    { key: "base_url",      label: "Base URL",       placeholder: "https://sandbox-api.agoda.com",  type: "url"      },
    { key: "api_key",       label: "API Key",        placeholder: "your_agoda_api_key",             type: "password" },
    { key: "client_id",     label: "Client ID",      placeholder: "your_agoda_client_id",           type: "text"     },
    { key: "client_secret", label: "Client Secret",  placeholder: "your_agoda_client_secret",       type: "password" },
  ],
  bookingcom: [
    { key: "base_url",      label: "Base URL",       placeholder: "https://demandapi-sandbox.booking.com/3.3", type: "url"      },
    { key: "affiliate_id",  label: "Affiliate ID",   placeholder: "your_booking_com_affiliate_id",            type: "text"     },
    { key: "api_token",     label: "API Token",      placeholder: "your_booking_com_api_token",               type: "password" },
  ],
  makemytrip: [
    { key: "base_url",      label: "Base URL",       placeholder: "https://api.makemytrip.com",    type: "url"      },
    { key: "api_key",       label: "API Key",        placeholder: "your_makemytrip_api_key",       type: "password" },
    { key: "client_id",     label: "Client ID",      placeholder: "your_makemytrip_client_id",     type: "text"     },
    { key: "client_secret", label: "Client Secret",  placeholder: "your_makemytrip_client_secret", type: "password" },
  ],
  expedia: [
    { key: "base_url",      label: "Base URL",       placeholder: "https://api.expediagroup.com",  type: "url"      },
    { key: "api_key",       label: "API Key",        placeholder: "your_expedia_api_key",          type: "password" },
    { key: "client_id",     label: "Client ID",      placeholder: "your_expedia_client_id",        type: "text"     },
    { key: "client_secret", label: "Client Secret",  placeholder: "your_expedia_client_secret",    type: "password" },
  ],
  _default: [
    { key: "base_url",      label: "Base URL",       placeholder: "https://api.provider.com",  type: "url"      },
    { key: "api_key",       label: "API Key",        placeholder: "your_api_key",              type: "password" },
    { key: "client_id",     label: "Client ID",      placeholder: "your_client_id",            type: "text"     },
    { key: "client_secret", label: "Client Secret",  placeholder: "your_client_secret",        type: "password" },
  ],
};

function getFields(channelName) {
  const key = (channelName || "").toLowerCase().replace(/[\s./\-]/g, "");
  if (key.includes("agoda"))      return CHANNEL_FIELDS.agoda;
  if (key.includes("booking"))    return CHANNEL_FIELDS.bookingcom;
  if (key.includes("makemytrip") || key.includes("bookmytrip")) return CHANNEL_FIELDS.makemytrip;
  if (key.includes("expedia"))    return CHANNEL_FIELDS.expedia;
  return CHANNEL_FIELDS._default;
}

function CredentialModal({ channel, onClose, onSaved, notify }) {
  const fields = getFields(channel.n);
  const [form, setForm] = useState(() => {
    const init = {};
    fields.forEach((f) => { init[f.key] = (channel.credentials && channel.credentials[f.key]) || ""; });
    return init;
  });
  const [saving, setSaving]             = useState(false);
  const [testing, setTesting]           = useState(false);
  const [testResult, setTestResult]     = useState(null);
  const [showSecrets, setShowSecrets]   = useState({});

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // First save draft credentials so test endpoint runs against them
      await api(`/api/channels/${channel.id}/credentials`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      const res = await api(`/api/channels/${channel.id}/test`, { method: "POST" });
      setTestResult(res);
      if (res.ok) {
        notify(`✓ Connection successful for ${channel.n}`);
      } else {
        notify(`Connection test failed: ${res.message || "Unknown error"}`);
      }
    } catch (err) {
      setTestResult({ ok: false, message: err.message || "Failed to reach API endpoint" });
      notify(err.message || "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await api(`/api/channels/${channel.id}/credentials`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      notify(`Credentials saved for ${channel.n}`);
      onSaved(result);
      onClose();
    } catch (err) {
      notify(err.message || "Failed to save credentials");
    } finally {
      setSaving(false);
    }
  };

  const toggleSecret = (key) =>
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="cred-modal-overlay" onClick={onClose}>
      <div className="cred-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Configure ${channel.n}`}>
        <div className="cred-modal-header">
          <div className="logo" style={{ background: channel.c, width: 36, height: 36, fontSize: 15, borderRadius: 8, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#fff", flexShrink:0 }}>{channel.n[0]}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>{channel.n} — API Credentials</h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
              Provide partner API keys to enable real-time reservation and inventory syncing.
            </p>
          </div>
          <button className="cred-modal-close" onClick={onClose} aria-label="Close">&#x2715;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cred-fields">
            {testResult && (
              <div className={`test-result-box ${testResult.ok ? "ok" : "err"}`}>
                <b>{testResult.ok ? "✓ Connection Verified" : "✗ Connection Failed"}</b>
                <div>{testResult.message}</div>
              </div>
            )}

            {fields.map((f) => (
              <div className="cred-field" key={f.key}>
                <label htmlFor={`cred-${channel.id}-${f.key}`}>{f.label}</label>
                <div className="cred-input-wrap">
                  <input
                    id={`cred-${channel.id}-${f.key}`}
                    type={f.type === "password" && !showSecrets[f.key] ? "password" : "text"}
                    placeholder={f.placeholder}
                    value={form[f.key] || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    autoComplete={f.type === "password" ? "new-password" : "off"}
                  />
                  {f.type === "password" && (
                    <button
                      type="button"
                      className="cred-eye"
                      tabIndex={-1}
                      onClick={() => toggleSecret(f.key)}
                      aria-label={showSecrets[f.key] ? "Hide" : "Show"}
                    >
                      {showSecrets[f.key] ? "🙈" : "👁"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="cred-modal-footer">
            <button
              type="button"
              className="btn ghost sm"
              onClick={handleTest}
              disabled={testing || saving}
              title="Test credentials against the partner API"
            >
              {testing ? "Testing…" : "🔌 Test Connection"}
            </button>
            <div style={{ flex: 1 }} />
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn" disabled={saving || testing}>
              {saving ? "Saving…" : "Save credentials"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Channels() {
  const { channels, toggleChannel, refresh, notify } = useStore();
  const [addOpen, setAddOpen]         = useState(false);
  const [name, setName]               = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [configuring, setConfiguring] = useState(null);
  const [syncingId, setSyncingId]     = useState(null);
  const [syncingAll, setSyncingAll]   = useState(false);
  const [testingId, setTestingId]     = useState(null);

  const toggle = (i) => toggleChannel(i);

  const handleCreate = async (channelName) => {
    const finalName = (channelName || name).trim();
    if (!finalName) { notify("Please enter a channel name"); return; }
    setSubmitting(true);
    try {
      await api("/api/channels", { method: "POST", body: JSON.stringify({ name: finalName }) });
      setName("");
      setAddOpen(false);
      await refresh();
      notify(`Channel "${finalName}" added`);
    } catch (err) {
      notify(err.message || "Failed to add channel");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCredSaved = async () => { await refresh(); };

  const handleSyncChannel = async (c) => {
    if (!c.configured) {
      notify(`Configure credentials for ${c.n} before syncing`);
      setConfiguring(c);
      return;
    }
    setSyncingId(c.id);
    try {
      const res = await api(`/api/channels/${c.id}/sync`, { method: "POST" });
      await refresh();
      notify(res.message || `Sync completed for ${c.n}`);
    } catch (err) {
      notify(err.message || `Failed to sync ${c.n}`);
      await refresh();
    } finally {
      setSyncingId(null);
    }
  };

  const handleTestChannel = async (c) => {
    if (!c.configured) {
      notify(`Configure credentials for ${c.n} before testing`);
      setConfiguring(c);
      return;
    }
    setTestingId(c.id);
    try {
      const res = await api(`/api/channels/${c.id}/test`, { method: "POST" });
      await refresh();
      if (res.ok) {
        notify(`✓ ${c.n} connection verified! (HTTP ${res.http_status || 200})`);
      } else {
        notify(`✗ ${c.n}: ${res.message || "Connection failed"}`);
      }
    } catch (err) {
      notify(err.message || `Connection error testing ${c.n}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const res = await api("/api/channels/sync-all", { method: "POST" });
      await refresh();
      const count = res.results ? res.results.length : 0;
      notify(`Sync completed for ${count} channel(s)`);
    } catch (err) {
      notify(err.message || "Failed to sync all channels");
    } finally {
      setSyncingAll(false);
    }
  };

  const statusBadge = (c) => {
    if (!c.on) return <Badge>Not connected</Badge>;
    if (c.status === "Connected") return <Badge color="green">Connected</Badge>;
    if (c.status === "Connection failed" || c.status === "Sync error") return <Badge color="red">{c.status}</Badge>;
    if (c.status === "Partial sync" || c.status === "Configuration required") return <Badge color="brass">{c.status}</Badge>;
    if (c.configured && c.on) return <Badge color="green">Connected</Badge>;
    return <Badge color="brass">Configuration required</Badge>;
  };

  const formatLastSync = (iso) => {
    if (!iso) return "Never";
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return iso;
    }
  };

  return (
    <>
      <PageHead title="Channel manager" subtitle="Connect booking platforms and keep rates and rooms in sync in real-time">
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn ghost"
            onClick={handleSyncAll}
            disabled={syncingAll || channels.length === 0}
            title="Immediately fetch bookings and push room inventory across all enabled channels"
          >
            {syncingAll ? "Syncing all…" : "⚡ Sync all channels"}
          </button>
          <button className="btn" onClick={() => setAddOpen((o) => !o)}>
            {addOpen ? "Close form" : "+ Add channel"}
          </button>
        </div>
      </PageHead>
      <SubNav parentPath="/channels" />

      {addOpen && (
        <div className="panel" style={{ marginBottom: 18 }}>
          <h2>Add booking channel</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <span className="muted" style={{ fontSize: 13, alignSelf: "center" }}>Popular channels:</span>
            {PRESET_CHANNELS.map((p) => (
              <button
                key={p}
                type="button"
                className="btn ghost sm"
                disabled={channels.some((c) => c.n === p) || submitting}
                onClick={() => handleCreate(p)}
              >
                + {p}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} style={{ display: "flex", gap: 10, maxWidth: 450 }}>
            <input
              required
              placeholder="Or enter custom channel name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save channel"}
            </button>
          </form>
        </div>
      )}

      {channels.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "36px 18px", marginBottom: 18 }}>
          <h3 style={{ marginBottom: 8, fontSize: 18 }}>No booking channels added yet</h3>
          <p className="muted" style={{ marginBottom: 16 }}>
            Add channels such as MakeMyTrip, Agoda, Booking.com, or Expedia to configure channel connections.
          </p>
          <button className="btn" onClick={() => setAddOpen(true)}>+ Add Channel</button>
        </div>
      ) : (
        <div className="row r-3">
          {channels.map((c, i) => (
            <div className="panel chan" key={c.n}>
              <header>
                <div className="logo" style={{ background: c.c }}>{c.n[0]}</div>
                <div>
                  <b>{c.n}</b>
                  <div className="muted">{c.d || "Availability, rates and reservation updates"}</div>
                </div>
                <button
                  className={`switch ${c.on ? "on" : ""}`}
                  role="switch"
                  aria-checked={c.on}
                  aria-label={`Toggle ${c.n}`}
                  onClick={() => toggle(i)}
                />
              </header>
              <dl className="kv">
                <dt>Status</dt><dd>{statusBadge(c)}</dd>
                <dt>Last sync</dt><dd>{formatLastSync(c.last_sync_at)}</dd>
                <dt>Bookings</dt><dd><b>{c.b ?? "0"}</b> imported</dd>
                <dt>Sync count</dt><dd>{c.sync_count || 0} cycles</dd>
              </dl>

              {c.last_error && (
                <div className="chan-error-alert" title={c.last_error}>
                  ⚠️ {c.last_error.length > 70 ? c.last_error.slice(0, 68) + "…" : c.last_error}
                </div>
              )}

              <div className="chan-footer">
                <button
                  className={`btn sm ${c.configured ? "ghost" : ""}`}
                  onClick={() => setConfiguring(c)}
                  id={`configure-${c.id}`}
                >
                  {c.configured ? "✎ Credentials" : "⚙ Configure"}
                </button>

                {c.configured && (
                  <>
                    <button
                      className="btn ghost sm"
                      onClick={() => handleTestChannel(c)}
                      disabled={testingId === c.id}
                      title="Ping partner API"
                    >
                      {testingId === c.id ? "Testing…" : "🔌 Test"}
                    </button>
                    <button
                      className="btn sm"
                      onClick={() => handleSyncChannel(c)}
                      disabled={syncingId === c.id || !c.on}
                      title="Sync reservations and push availability now"
                    >
                      {syncingId === c.id ? "Syncing…" : "⚡ Sync"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row r-2">
        <div className="panel">
          <h2>Real-time Booking & Availability Flow</h2>
          <div className="sub">Automated 2-way sync lifecycle</div>
          <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, fontSize: 13, lineHeight: 1.5 }}>
            {FLOW.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </div>
        <div className="panel">
          <h2>⚡ Instant Webhook Integration</h2>
          <div className="sub">Zero-delay push notifications from OTA platforms</div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>
            For real-time instant booking injection without waiting for polling, configure your partner portal webhook URL:
          </p>
          <div className="webhook-box">
            <code>POST /api/channels/&#123;channel_name&#125;/webhook</code>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "10px 0 0" }}>
            Example: <code>/api/channels/agoda/webhook</code> or <code>/api/channels/makemytrip/webhook</code>. Payloads are automatically validated and inserted into the front desk ledger.
          </p>
        </div>
      </div>

      {configuring && (
        <CredentialModal
          channel={configuring}
          notify={notify}
          onClose={() => setConfiguring(null)}
          onSaved={handleCredSaved}
        />
      )}

      <style>{`
        .chan-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid var(--border, rgba(255,255,255,.08));
          flex-wrap: wrap;
        }
        .chan-error-alert {
          margin-top: 8px;
          padding: 6px 10px;
          border-radius: 6px;
          background: rgba(220, 38, 38, 0.12);
          border: 1px solid rgba(220, 38, 38, 0.3);
          color: #fca5a5;
          font-size: 11px;
          line-height: 1.4;
          word-break: break-word;
        }
        .webhook-box {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border, rgba(255,255,255,.1));
          border-radius: 8px;
          padding: 10px 14px;
          font-family: monospace;
          color: #38bdf8;
          font-size: 13px;
        }
        .test-result-box {
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 12px;
          line-height: 1.4;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .test-result-box.ok {
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #86efac;
        }
        .test-result-box.err {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }
        .cred-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.55);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .cred-modal {
          background: var(--surface, #1a1d2e);
          border: 1px solid var(--border, rgba(255,255,255,.12));
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 24px 64px rgba(0,0,0,.6);
          overflow: hidden;
          animation: modalIn .18s ease;
        }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(12px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .cred-modal-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 18px 20px 14px;
          border-bottom: 1px solid var(--border, rgba(255,255,255,.08));
        }
        .cred-modal-close {
          background: none;
          border: none;
          color: var(--muted);
          font-size: 16px;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 6px;
          transition: background .15s;
          line-height: 1;
          margin-left: auto;
          flex-shrink: 0;
        }
        .cred-modal-close:hover { background: rgba(255,255,255,.1); color: #fff; }
        .cred-fields {
          padding: 18px 20px 4px;
          display: grid;
          gap: 14px;
          max-height: 65vh;
          overflow-y: auto;
        }
        .cred-field label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: var(--muted);
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: .6px;
        }
        .cred-input-wrap {
          position: relative;
          display: flex;
        }
        .cred-input-wrap input {
          flex: 1;
          padding-right: 36px;
          font-family: "JetBrains Mono", "Fira Mono", monospace;
          font-size: 13px;
        }
        .cred-eye {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          opacity: .6;
          transition: opacity .15s;
          padding: 0 2px;
        }
        .cred-eye:hover { opacity: 1; }
        .cred-modal-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 20px;
          border-top: 1px solid var(--border, rgba(255,255,255,.08));
        }
      `}</style>
    </>
  );
}
