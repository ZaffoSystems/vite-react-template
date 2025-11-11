import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Activity, Brain, Zap, Cog, RefreshCw } from 'lucide-react';

interface Deployment {
  id: string;
  worker_name: string;
  deployment_url: string;
  resource_bindings: string;
  status: string;
  created_at: number;
}

export default function AgentManagement() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [stats, setStats] = useState({
    totalDeployments: 0,
    totalResources: 0,
    ragDocuments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Get MasterAgent status
      const statusRes = await fetch('/api/master/status');
      const statusData = await statusRes.json();

      setStats({
        totalDeployments: statusData.deployments || 0,
        totalResources: statusData.resources?.total || 0,
        ragDocuments: statusData.rag?.totalDocuments || 0,
      });

      // Get recent deployments
      const deploymentsRes = await fetch('/api/deployments?limit=10');
      const deploymentsData = await deploymentsRes.json();
      setDeployments(deploymentsData.deployments || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string = 'active') => {
    const classes = {
      active: 'status-active',
      deploying: 'status-pending',
      failed: 'status-error',
    };
    return <span className={`status-badge ${classes[status as keyof typeof classes] || 'status-active'}`}>{status}</span>;
  };

  if (loading) {
    return <div className="loading">Loading Master Agent status...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Master Control Agent</h2>
          <p>Autonomous infrastructure management and deployment</p>
        </div>
        <button onClick={loadData} className="btn btn-secondary">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* MasterAgent Capabilities */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">Agent Capabilities</div>
          <span className="status-badge status-active">Operational</span>
        </div>
        <div className="grid grid-3" style={{ gap: '16px', marginTop: '16px' }}>
          <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Cog size={20} color="#f38020" />
              <span style={{ fontWeight: 600 }}>Resource Management</span>
            </div>
            <p style={{ fontSize: '13px', color: '#aaa' }}>
              Create and manage KV, D1, R2, Vectorize, Hyperdrive, Queues
            </p>
          </div>

          <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Zap size={20} color="#fbbf24" />
              <span style={{ fontWeight: 600 }}>Worker Deployment</span>
            </div>
            <p style={{ fontSize: '13px', color: '#aaa' }}>
              Generate code, provision resources, deploy workers autonomously
            </p>
          </div>

          <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Brain size={20} color="#22c55e" />
              <span style={{ fontWeight: 600 }}>Natural Language</span>
            </div>
            <p style={{ fontSize: '13px', color: '#aaa' }}>
              Understand commands and create autonomous execution plans
            </p>
          </div>

          <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Activity size={20} color="#3b82f6" />
              <span style={{ fontWeight: 600 }}>MCP Integration</span>
            </div>
            <p style={{ fontSize: '13px', color: '#aaa' }}>
              Access 71+ MCP servers for GitHub, AWS, databases, and more
            </p>
          </div>

          <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Brain size={20} color="#8b5cf6" />
              <span style={{ fontWeight: 600 }}>RAG Context</span>
            </div>
            <p style={{ fontSize: '13px', color: '#aaa' }}>
              Semantic search over documentation and code examples
            </p>
          </div>

          <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Zap size={20} color="#ec4899" />
              <span style={{ fontWeight: 600 }}>Code Generation</span>
            </div>
            <p style={{ fontSize: '13px', color: '#aaa' }}>
              Generate TypeScript worker code with proper bindings
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-3" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>Total Deployments</div>
              <div style={{ fontSize: '32px', fontWeight: 600 }}>{stats.totalDeployments}</div>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(243, 128, 32, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Zap size={24} color="#f38020" />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>Total Resources</div>
              <div style={{ fontSize: '32px', fontWeight: 600 }}>{stats.totalResources}</div>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(251, 191, 36, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Cog size={24} color="#fbbf24" />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>RAG Documents</div>
              <div style={{ fontSize: '32px', fontWeight: 600 }}>{stats.ragDocuments}</div>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(34, 197, 94, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Brain size={24} color="#22c55e" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Deployments */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent Deployments</div>
        </div>

        {deployments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
            <Zap size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p>No deployments yet. Use Chat Interface to deploy your first worker.</p>
          </div>
        ) : (
          <div className="grid grid-2">
            {deployments.map(deployment => {
              let bindings: any = {};
              try {
                bindings = deployment.resource_bindings ? JSON.parse(deployment.resource_bindings) : {};
              } catch (e) {
                // ignore
              }

              return (
                <div key={deployment.id} className="card">
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Zap size={20} />
                      <div>
                        <Link
                          to={`/deployments/${deployment.id}`}
                          style={{ fontSize: '16px', fontWeight: 600, color: '#fff', textDecoration: 'none' }}
                          onMouseOver={(e) => (e.currentTarget.style.color = '#f38020')}
                          onMouseOut={(e) => (e.currentTarget.style.color = '#fff')}
                        >
                          {deployment.worker_name}
                        </Link>
                        {deployment.deployment_url && (
                          <a
                            href={deployment.deployment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '12px', color: '#f38020' }}
                          >
                            {deployment.deployment_url}
                          </a>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(deployment.status)}
                  </div>

                  {Object.keys(bindings).length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Resource Bindings:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {Object.entries(bindings).map(([key, value]) => (
                          <span
                            key={key}
                            style={{
                              fontSize: '11px',
                              padding: '4px 8px',
                              background: '#252525',
                              borderRadius: '4px',
                              color: '#888',
                            }}
                          >
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: '#666', marginTop: '12px' }}>
                    Deployed: {new Date(deployment.created_at).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
