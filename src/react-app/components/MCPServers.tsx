import { useState, useEffect } from 'react';
import { Server, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface MCPServer {
  id: string;
  name: string;
  url: string;
  description: string;
  capabilities: string[];
  status?: boolean;
}

export default function MCPServers() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mcp-cf/servers');
      const data = await res.json();
      setServers(data.servers || []);

      // Get status
      const statusRes = await fetch('/api/mcp-cf/status');
      const statusData = await statusRes.json();
      setStatus(statusData.status || {});
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    }
    setLoading(false);
  };

  const initializeServers = async () => {
    setInitializing(true);
    try {
      const res = await fetch('/api/mcp-cf/init', {
        method: 'POST',
      });
      const data = await res.json();
      setStatus(data.servers || {});
    } catch (error) {
      console.error('Failed to initialize MCP servers:', error);
    }
    setInitializing(false);
  };

  if (loading) {
    return <div className="loading">Loading MCP servers...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>MCP Servers</h2>
          <p>Manage Model Context Protocol server connections</p>
        </div>
        <button
          onClick={initializeServers}
          disabled={initializing}
          className="btn btn-primary"
        >
          <RefreshCw size={16} className={initializing ? 'spin' : ''} />
          {initializing ? 'Initializing...' : 'Initialize All'}
        </button>
      </div>

      <div className="grid grid-2">
        {servers.map(server => (
          <div key={server.id} className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Server size={20} />
                <div>
                  <div className="card-title">{server.name}</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                    {server.id}
                  </div>
                </div>
              </div>
              {status[server.id] !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {status[server.id] ? (
                    <>
                      <CheckCircle size={16} color="#22c55e" />
                      <span className="status-badge status-active">Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={16} color="#ef4444" />
                      <span className="status-badge status-error">Disconnected</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '12px', lineHeight: '1.5' }}>
              {server.description}
            </p>

            <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
              Capabilities:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {server.capabilities.map((cap, idx) => (
                <span key={idx} style={{
                  fontSize: '10px',
                  padding: '3px 8px',
                  background: '#252525',
                  borderRadius: '4px',
                  color: '#888',
                }}>
                  {cap}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {servers.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <Server size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ color: '#666' }}>No MCP servers available</p>
        </div>
      )}
    </div>
  );
}
