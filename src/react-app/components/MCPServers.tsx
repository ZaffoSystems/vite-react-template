import { useState, useEffect } from 'react';
import { Server, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface MCPServer {
  id: string;
  name: string;
  url?: string;
  repository?: string;
  npmPackage?: string;
  description: string;
  capabilities: string[];
  category?: string;
  requiresAuth?: boolean;
  status?: boolean;
}

export default function MCPServers() {
  const [cfServers, setCfServers] = useState<MCPServer[]>([]);
  const [awesomeServers, setAwesomeServers] = useState<MCPServer[]>([]);
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<'cloudflare' | 'awesome'>('cloudflare');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setLoading(true);
    try {
      // Load Cloudflare MCP servers
      const cfRes = await fetch('/api/mcp-cf/servers');
      const cfData = await cfRes.json();
      setCfServers(cfData.servers || []);

      // Get CF status
      const cfStatusRes = await fetch('/api/mcp-cf/status');
      const cfStatusData = await cfStatusRes.json();
      const cfStatus = cfStatusData.status || {};

      // Load Awesome MCP servers
      const awesomeRes = await fetch('/api/mcp-awesome/servers');
      const awesomeData = await awesomeRes.json();
      setAwesomeServers(awesomeData.servers || []);

      // Get Awesome status
      const awesomeStatusRes = await fetch('/api/mcp-awesome/status');
      const awesomeStatusData = await awesomeStatusRes.json();
      const awesomeStatus = awesomeStatusData.status || {};

      // Combine statuses
      setStatus({ ...cfStatus, ...awesomeStatus });
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    }
    setLoading(false);
  };

  const initializeServers = async () => {
    setInitializing(true);
    try {
      // Initialize CF servers
      const cfRes = await fetch('/api/mcp-cf/init', {
        method: 'POST',
      });
      const cfData = await cfRes.json();

      // Initialize Awesome servers
      const awesomeRes = await fetch('/api/mcp-awesome/init', {
        method: 'POST',
      });
      const awesomeData = await awesomeRes.json();

      // Reload status
      await loadServers();
    } catch (error) {
      console.error('Failed to initialize MCP servers:', error);
    }
    setInitializing(false);
  };

  const getCategories = () => {
    const servers = activeTab === 'cloudflare' ? cfServers : awesomeServers;
    const cats = [...new Set(servers.map(s => s.category || 'other'))];
    return cats.sort();
  };

  const getFilteredServers = () => {
    const servers = activeTab === 'cloudflare' ? cfServers : awesomeServers;
    if (categoryFilter === 'all') return servers;
    return servers.filter(s => (s.category || 'other') === categoryFilter);
  };

  if (loading) {
    return <div className="loading">Loading MCP servers...</div>;
  }

  const filteredServers = getFilteredServers();
  const categories = getCategories();
  const totalServers = cfServers.length + awesomeServers.length;
  const connectedCount = Object.values(status).filter(s => s).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>MCP Servers</h2>
          <p>Manage {totalServers} Model Context Protocol server connections ({connectedCount} connected)</p>
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

      <div className="card">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #333' }}>
          <button
            onClick={() => { setActiveTab('cloudflare'); setCategoryFilter('all'); }}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'cloudflare' ? '2px solid #f38020' : '2px solid transparent',
              color: activeTab === 'cloudflare' ? '#f38020' : '#888',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Cloudflare MCP ({cfServers.length})
          </button>
          <button
            onClick={() => { setActiveTab('awesome'); setCategoryFilter('all'); }}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'awesome' ? '2px solid #f38020' : '2px solid transparent',
              color: activeTab === 'awesome' ? '#f38020' : '#888',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Awesome MCP ({awesomeServers.length})
          </button>
        </div>

        {activeTab === 'awesome' && (
          <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setCategoryFilter('all')}
              className={`btn ${categoryFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`btn ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: '12px', textTransform: 'capitalize' }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-2">
          {filteredServers.map(server => (
            <div key={server.id} className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Server size={20} />
                  <div>
                    <div className="card-title">{server.name}</div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                      {server.id}
                      {server.category && (
                        <span style={{ marginLeft: '8px', color: '#f38020' }}>
                          [{server.category}]
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {status[server.id] !== undefined && (
                    <>
                      {status[server.id] ? (
                        <>
                          <CheckCircle size={16} color="#22c55e" />
                          <span className="status-badge status-active">Connected</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={16} color="#ef4444" />
                          <span className="status-badge status-error">
                            {server.requiresAuth ? 'Auth Required' : 'Disconnected'}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '12px', lineHeight: '1.5' }}>
                {server.description}
              </p>

              {(server.npmPackage || server.repository) && (
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                  {server.npmPackage && (
                    <div>📦 {server.npmPackage}</div>
                  )}
                  {server.repository && (
                    <div style={{ wordBreak: 'break-all' }}>🔗 {server.repository}</div>
                  )}
                </div>
              )}

              <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                Capabilities ({server.capabilities.length}):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {server.capabilities.slice(0, 8).map((cap, idx) => (
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
                {server.capabilities.length > 8 && (
                  <span style={{
                    fontSize: '10px',
                    padding: '3px 8px',
                    color: '#666',
                  }}>
                    +{server.capabilities.length - 8} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredServers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <Server size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p style={{ color: '#666' }}>No servers found in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
