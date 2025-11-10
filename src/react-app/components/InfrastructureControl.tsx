import { useState, useEffect } from 'react';
import { Database, HardDrive, Package, Zap, RefreshCw } from 'lucide-react';

export default function InfrastructureControl() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [kvNamespaces, setKvNamespaces] = useState<any[]>([]);
  const [d1Databases, setD1Databases] = useState<any[]>([]);
  const [r2Buckets, setR2Buckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workers');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([
      loadWorkers(),
      loadKV(),
      loadD1(),
      loadR2(),
    ]);
    setLoading(false);
  };

  const loadWorkers = async () => {
    try {
      const res = await fetch('/api/cf/workers');
      const data = await res.json();
      setWorkers(data.workers || []);
    } catch (error) {
      console.error('Failed to load workers:', error);
    }
  };

  const loadKV = async () => {
    try {
      const res = await fetch('/api/cf/kv');
      const data = await res.json();
      setKvNamespaces(data.namespaces || []);
    } catch (error) {
      console.error('Failed to load KV:', error);
    }
  };

  const loadD1 = async () => {
    try {
      const res = await fetch('/api/cf/d1');
      const data = await res.json();
      setD1Databases(data.databases || []);
    } catch (error) {
      console.error('Failed to load D1:', error);
    }
  };

  const loadR2 = async () => {
    try {
      const res = await fetch('/api/cf/r2');
      const data = await res.json();
      setR2Buckets(data.buckets || []);
    } catch (error) {
      console.error('Failed to load R2:', error);
    }
  };

  const renderWorkers = () => (
    <div className="grid grid-2">
      {workers.map((worker, idx) => (
        <div key={idx} className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Zap size={20} />
              <div className="card-title">{worker.id || worker.name}</div>
            </div>
            <span className="status-badge status-active">Active</span>
          </div>
          <div style={{ fontSize: '13px', color: '#aaa' }}>
            {worker.created_on && `Created: ${new Date(worker.created_on).toLocaleDateString()}`}
          </div>
        </div>
      ))}
      {workers.length === 0 && (
        <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
          <Zap size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ color: '#666' }}>No workers found</p>
        </div>
      )}
    </div>
  );

  const renderKV = () => (
    <div className="grid grid-2">
      {kvNamespaces.map((ns, idx) => (
        <div key={idx} className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Package size={20} />
              <div className="card-title">{ns.title}</div>
            </div>
            <span className="status-badge status-active">Active</span>
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            ID: {ns.id}
          </div>
        </div>
      ))}
      {kvNamespaces.length === 0 && (
        <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
          <Package size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ color: '#666' }}>No KV namespaces found</p>
        </div>
      )}
    </div>
  );

  const renderD1 = () => (
    <div className="grid grid-2">
      {d1Databases.map((db, idx) => (
        <div key={idx} className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Database size={20} />
              <div className="card-title">{db.name}</div>
            </div>
            <span className="status-badge status-active">Active</span>
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            ID: {db.uuid || db.id}
          </div>
        </div>
      ))}
      {d1Databases.length === 0 && (
        <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
          <Database size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ color: '#666' }}>No D1 databases found</p>
        </div>
      )}
    </div>
  );

  const renderR2 = () => (
    <div className="grid grid-2">
      {r2Buckets.map((bucket, idx) => (
        <div key={idx} className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <HardDrive size={20} />
              <div className="card-title">{bucket.name}</div>
            </div>
            <span className="status-badge status-active">Active</span>
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            Created: {bucket.creation_date && new Date(bucket.creation_date).toLocaleDateString()}
          </div>
        </div>
      ))}
      {r2Buckets.length === 0 && (
        <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
          <HardDrive size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ color: '#666' }}>No R2 buckets found</p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return <div className="loading">Loading infrastructure...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Infrastructure Control</h2>
          <p>Manage all your Cloudflare resources</p>
        </div>
        <button onClick={loadAll} className="btn btn-secondary">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #333' }}>
          {[
            { id: 'workers', label: 'Workers', icon: <Zap size={16} /> },
            { id: 'kv', label: 'KV', icon: <Package size={16} /> },
            { id: 'd1', label: 'D1', icon: <Database size={16} /> },
            { id: 'r2', label: 'R2', icon: <HardDrive size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #f38020' : '2px solid transparent',
                color: activeTab === tab.id ? '#f38020' : '#888',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'workers' && renderWorkers()}
        {activeTab === 'kv' && renderKV()}
        {activeTab === 'd1' && renderD1()}
        {activeTab === 'r2' && renderR2()}
      </div>
    </div>
  );
}
