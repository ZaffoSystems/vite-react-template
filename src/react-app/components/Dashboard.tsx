import { useState, useEffect } from 'react';
import { Server, Activity, Database, FileText, Package } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    resources: 0,
    deployments: 0,
    ragDocuments: 0,
    ragChunks: 0,
    activeTasks: 0,
    completedTasks: 0,
  });
  const [resourcesByType, setResourcesByType] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load Master Agent status
      const statusRes = await fetch('/api/master/status');
      const statusData = await statusRes.json();

      setStats({
        resources: statusData.resources?.total || 0,
        deployments: statusData.deployments || 0,
        ragDocuments: statusData.rag?.totalDocuments || 0,
        ragChunks: statusData.rag?.totalChunks || 0,
        activeTasks: statusData.tasks?.find((t: any) => t.status === 'processing')?.count || 0,
        completedTasks: statusData.tasks?.find((t: any) => t.status === 'completed')?.count || 0,
      });

      setResourcesByType(statusData.resources?.byType || {});
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your Master Control Agent system</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '30px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>CF Resources</div>
              <div style={{ fontSize: '32px', fontWeight: 600 }}>{stats.resources}</div>
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
              <Database size={24} color="#f38020" />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>Deployments</div>
              <div style={{ fontSize: '32px', fontWeight: 600 }}>{stats.deployments}</div>
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
              <Server size={24} color="#fbbf24" />
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
              <FileText size={24} color="#22c55e" />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>Active Tasks</div>
              <div style={{ fontSize: '32px', fontWeight: 600 }}>{stats.activeTasks}</div>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Activity size={24} color="#3b82f6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Resources by Type</div>
          </div>
          {Object.keys(resourcesByType).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 0' }}>
              {Object.entries(resourcesByType).map(([type, count]) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={16} color="#888" />
                    <span style={{ fontSize: '14px', textTransform: 'uppercase' }}>{type}</span>
                  </div>
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#f38020' }}>{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No resources created yet
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">System Status</div>
            <span className="status-badge status-active">Operational</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#aaa' }}>Master Agent</span>
                <span style={{ color: '#22c55e' }}>Active</span>
              </div>
              <div style={{ height: '4px', background: '#252525', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#22c55e' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#aaa' }}>Resource Manager</span>
                <span style={{ color: '#22c55e' }}>Online</span>
              </div>
              <div style={{ height: '4px', background: '#252525', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#22c55e' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#aaa' }}>RAG Service</span>
                <span style={{ color: '#22c55e' }}>Ready</span>
              </div>
              <div style={{ height: '4px', background: '#252525', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#22c55e' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#aaa' }}>AI Gateway</span>
                <span style={{ color: '#22c55e' }}>Connected</span>
              </div>
              <div style={{ height: '4px', background: '#252525', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#22c55e' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '30px' }}>
        <div className="card-header">
          <div className="card-title">RAG Statistics</div>
        </div>
        <div className="grid grid-4" style={{ padding: '20px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#f38020', marginBottom: '4px' }}>
              {stats.ragDocuments}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>Documents</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#f38020', marginBottom: '4px' }}>
              {stats.ragChunks}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>Chunks</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#f38020', marginBottom: '4px' }}>
              {stats.completedTasks}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>Completed Tasks</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#f38020', marginBottom: '4px' }}>
              {stats.deployments}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>Worker Deployments</div>
          </div>
        </div>
      </div>
    </div>
  );
}
