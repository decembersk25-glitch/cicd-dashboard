import React, { useEffect, useState } from 'react';

const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN;  // paste your token
const OWNER = 'decembersk25-glitch';
const REPO  = 'cicd-dashboard';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function duration(start, end) {
  if (!start || !end) return 'running...';
  const s = Math.floor((new Date(end) - new Date(start)) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s/60)}m ${s%60}s`;
}

export default function CICDDashboard() {
  const [runs, setRuns]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchRuns = async () => {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs?per_page=20`,
        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } }
      );
      const data = await res.json();
      setRuns(data.workflow_runs || []);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Compute metrics
  const total      = runs.length;
  const successes  = runs.filter(r => r.conclusion === 'success').length;
  const failures   = runs.filter(r => r.conclusion === 'failure').length;
  const successRate= total ? Math.round((successes / total) * 100) : 0;
  const durations  = runs
    .filter(r => r.run_started_at && r.updated_at && r.conclusion)
    .map(r => (new Date(r.updated_at) - new Date(r.run_started_at)) / 1000);
  const avgBuild   = durations.length
    ? Math.round(durations.reduce((a,b) => a+b, 0) / durations.length)
    : 0;

  const metrics = [
    { label: 'Success rate',      value: `${successRate}%`                          },
    { label: 'Total runs',        value: total                                       },
    { label: 'Failures',          value: failures                                    },
    { label: 'Avg build time',    value: avgBuild < 60 ? `${avgBuild}s` : `${Math.floor(avgBuild/60)}m ${avgBuild%60}s` },
  ];

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: '0 0 4px' }}>CI/CD Pipeline Performance</h2>
          <p style={{ color: '#888', margin: 0, fontSize: 13 }}>{OWNER}/{REPO} · live data from GitHub Actions</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#E1F5EE', color: '#0F6E56',
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1D9E75', display: 'inline-block' }}></span>
            Live
          </div>
          {lastUpdate && <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>Updated {lastUpdate}</p>}
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        {metrics.map(m => (
          <div key={m.label} style={{ background: '#f7f7f7', borderRadius: 8, padding: '14px 16px' }}>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>{m.label}</p>
            <p style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Runs Table */}
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <p style={{ fontWeight: 500, margin: 0, color: '#555', fontSize: 14 }}>Recent pipeline runs</p>
          <button
            onClick={fetchRuns}
            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#aaa', fontSize: 14 }}>Loading pipeline data...</p>
        ) : runs.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 14 }}>No pipeline runs found.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                {['Run', 'Workflow', 'Branch', 'Status', 'Duration', 'Triggered'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0 8px 10px 0', color: '#999', fontWeight: 500, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map(r => {
                const isSuccess  = r.conclusion === 'success';
                const isFailure  = r.conclusion === 'failure';
                const isRunning  = !r.conclusion;
                const badgeBg    = isSuccess ? '#E1F5EE' : isFailure ? '#FCEBEB' : '#FAEEDA';
                const badgeColor = isSuccess ? '#0F6E56' : isFailure ? '#A32D2D' : '#854F0B';
                const label      = isRunning ? 'Running' : r.conclusion.charAt(0).toUpperCase() + r.conclusion.slice(1);
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <td style={{ padding: '10px 8px 10px 0', color: '#666' }}>#{r.run_number}</td>
                    <td style={{ padding: '10px 8px 10px 0', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                    <td style={{ padding: '10px 8px 10px 0' }}>
                      <code style={{ fontSize: 11, background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{r.head_branch}</code>
                    </td>
                    <td style={{ padding: '10px 8px 10px 0' }}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500, background: badgeBg, color: badgeColor }}>
                        {isRunning && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#BA7517', marginRight: 5 }}></span>}
                        {label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px 10px 0', color: '#555' }}>{duration(r.run_started_at, r.updated_at)}</td>
                    <td style={{ color: '#aaa' }}>{timeAgo(r.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer note */}
      <p style={{ fontSize: 11, color: '#ccc', marginTop: '1rem', textAlign: 'center' }}>
        Auto-refreshes every 30 seconds · powered by GitHub Actions API
      </p>
    </div>
  );
}