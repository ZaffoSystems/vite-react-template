import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Database, RefreshCw, Zap, AlertCircle } from 'lucide-react';

interface Deployment {
  id: string;
  worker_name: string;
  deployment_url: string;
  resource_bindings: string;
  status: string;
  created_at: number;
}

export default function DeploymentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [bindings, setBindings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDeployment();
  }, [id]);

  const loadDeployment = async () => {
    try {
      const res = await fetch(`/api/deployments/${id}`);
      if (!res.ok) {
        throw new Error('Deployment not found');
      }
      const data = await res.json();
      setDeployment(data.deployment);

      try {
        const parsedBindings = data.deployment.resource_bindings
          ? JSON.parse(data.deployment.resource_bindings)
          : {};
        setBindings(parsedBindings);
      } catch (e) {
        setBindings({});
      }
    } catch (error: any) {
      setError(error.message);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="loading">Loading deployment...</div>;
  }

  if (error || !deployment) {
    return (
      <div>
        <div className="page-header">
          <button onClick={() => navigate(-1)} className="btn btn-secondary">
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <AlertCircle size={48} style={{ opacity: 0.3, marginBottom: '16px', color: '#ef4444' }} />
          <h3 style={{ marginBottom: '8px' }}>Deployment Not Found</h3>
          <p style={{ color: '#666' }}>{error || 'The deployment you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22c55e';
      case 'failed': return '#ef4444';
      case 'deploying': return '#fbbf24';
      default: return '#888';
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
            style={{ marginBottom: '12px' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h2>{deployment.worker_name}</h2>
          <p>Deployment Details</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={loadDeployment} className="btn btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>
          {deployment.deployment_url && (
            <a
              href={deployment.deployment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <ExternalLink size={16} />
              Open Worker
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-2">
        {/* Status Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Status</div>
            <span
              className="status-badge"
              style={{
                background: `${getStatusColor(deployment.status)}20`,
                color: getStatusColor(deployment.status),
                border: `1px solid ${getStatusColor(deployment.status)}`
              }}
            >
              {deployment.status}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Worker Name</div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{deployment.worker_name}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Deployment ID</div>
              <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#aaa' }}>{deployment.id}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Deployed</div>
              <div style={{ fontSize: '13px' }}>{new Date(deployment.created_at).toLocaleString()}</div>
            </div>
            {deployment.deployment_url && (
              <div>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>URL</div>
                <a
                  href={deployment.deployment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '13px', color: '#f38020', wordBreak: 'break-all' }}
                >
                  {deployment.deployment_url}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Resource Bindings Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={20} />
              <div className="card-title">Resource Bindings</div>
            </div>
            <span style={{ fontSize: '12px', color: '#888' }}>
              {Object.keys(bindings).length} bindings
            </span>
          </div>
          {Object.keys(bindings).length > 0 ? (
            <div style={{ marginTop: '16px' }}>
              {Object.entries(bindings).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    padding: '12px',
                    background: '#1a1a1a',
                    borderRadius: '6px',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>
                    {key}
                  </div>
                  <div style={{ fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <Database size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>No resource bindings</p>
            </div>
          )}
        </div>
      </div>

      {/* Worker Code Section (if available) */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={20} />
            <div className="card-title">Worker Information</div>
          </div>
        </div>
        <div style={{ marginTop: '16px', padding: '16px', background: '#1a1a1a', borderRadius: '6px' }}>
          <div style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.6' }}>
            <p>This worker was deployed via the Master Control Agent.</p>
            <p style={{ marginTop: '8px' }}>
              To view the worker code, logs, and metrics, visit the{' '}
              <a
                href={`https://dash.cloudflare.com`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#f38020' }}
              >
                Cloudflare Dashboard
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
