import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw, Zap, Database } from 'lucide-react';

interface Deployment {
  id: string;
  worker_name: string;
  deployment_url: string;
  resource_bindings: string;
  status: string;
  created_at: number;
}

interface Resource {
  id: string;
  resource_type: string;
  resource_name: string;
  resource_id: string;
  configuration: string;
  created_at: number;
}

export default function TaskMonitor() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeTab, setActiveTab] = useState<'deployments' | 'resources'>('deployments');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000); // Refresh every 3s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Load deployments
      const deploymentsRes = await fetch('/api/deployments?limit=50');
      const deploymentsData = await deploymentsRes.json();
      setDeployments(deploymentsData.deployments || []);

      // Load resources
      const resourcesRes = await fetch('/api/resources');
      const resourcesData = await resourcesRes.json();
      setResources(resourcesData.resources || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={16} color="#22c55e" />;
      case 'failed': return <XCircle size={16} color="#ef4444" />;
      case 'deploying': return <RefreshCw size={16} color="#fbbf24" className="spin" />;
      default: return <Clock size={16} color="#888" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      active: 'status-active',
      deploying: 'status-pending',
      failed: 'status-error',
    };
    return <span className={`status-badge ${classes[status as keyof typeof classes] || 'status-active'}`}>{status}</span>;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return <div className="loading">Loading activity...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Activity Monitor</h2>
          <p>Track deployments and resource creation</p>
        </div>
        <button onClick={loadData} className="btn btn-secondary">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('deployments')}
              className={`btn ${activeTab === 'deployments' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <Zap size={14} />
              Deployments ({deployments.length})
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`btn ${activeTab === 'resources' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <Database size={14} />
              Resources ({resources.length})
            </button>
          </div>
        </div>

        {activeTab === 'deployments' && (
          <>
            {deployments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <Zap size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>No deployments yet</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Worker Name</th>
                    <th>Deployment URL</th>
                    <th>Resource Bindings</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.map(deployment => {
                    let bindings: any = {};
                    try {
                      bindings = deployment.resource_bindings ? JSON.parse(deployment.resource_bindings) : {};
                    } catch (e) {
                      // ignore
                    }

                    return (
                      <tr key={deployment.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {getStatusIcon(deployment.status)}
                            {getStatusBadge(deployment.status)}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{deployment.worker_name}</td>
                        <td>
                          {deployment.deployment_url ? (
                            <a
                              href={deployment.deployment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#f38020', fontSize: '12px' }}
                            >
                              {deployment.deployment_url}
                            </a>
                          ) : (
                            <span style={{ color: '#666' }}>-</span>
                          )}
                        </td>
                        <td>
                          {Object.keys(bindings).length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {Object.keys(bindings).slice(0, 3).map((key) => (
                                <span
                                  key={key}
                                  style={{
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    background: '#252525',
                                    borderRadius: '3px',
                                    color: '#888',
                                  }}
                                >
                                  {key}
                                </span>
                              ))}
                              {Object.keys(bindings).length > 3 && (
                                <span style={{ fontSize: '10px', color: '#666' }}>
                                  +{Object.keys(bindings).length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#666' }}>None</span>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', color: '#888' }}>
                          {formatTime(deployment.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        {activeTab === 'resources' && (
          <>
            {resources.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <Database size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>No resources created yet</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Resource ID</th>
                    <th>Configuration</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map(resource => {
                    let config: any = {};
                    try {
                      config = resource.configuration ? JSON.parse(resource.configuration) : {};
                    } catch (e) {
                      // ignore
                    }

                    return (
                      <tr key={resource.id}>
                        <td>
                          <span
                            style={{
                              padding: '4px 8px',
                              background: '#252525',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              color: '#f38020',
                            }}
                          >
                            {resource.resource_type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{resource.resource_name}</td>
                        <td style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>
                          {resource.resource_id}
                        </td>
                        <td>
                          {Object.keys(config).length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {Object.entries(config).slice(0, 2).map(([key, value]) => (
                                <span
                                  key={key}
                                  style={{
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    background: '#1a1a1a',
                                    borderRadius: '3px',
                                    color: '#888',
                                  }}
                                >
                                  {key}: {String(value)}
                                </span>
                              ))}
                              {Object.keys(config).length > 2 && (
                                <span style={{ fontSize: '10px', color: '#666' }}>
                                  +{Object.keys(config).length - 2} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#666' }}>-</span>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', color: '#888' }}>
                          {formatTime(resource.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
