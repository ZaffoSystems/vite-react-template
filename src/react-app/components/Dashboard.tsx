import { useState, useEffect } from 'react';
import { Bot, CheckSquare, Server, Activity, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    agents: 0,
    activeTasks: 0,
    completedTasks: 0,
    mcpServers: 0,
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load agents
      const agentsRes = await fetch('/api/agents');
      const agentsData = await agentsRes.json();

      // Load tasks
      const tasksRes = await fetch('/api/tasks?limit=10');
      const tasksData = await tasksRes.json();

      // Load MCP servers
      const mcpRes = await fetch('/api/mcp-cf/servers');
      const mcpData = await mcpRes.json();

      setStats({
        agents: agentsData.agents?.length || 0,
        activeTasks: tasksData.tasks?.filter((t: any) => t.status === 'processing').length || 0,
        completedTasks: tasksData.tasks?.filter((t: any) => t.status === 'completed').length || 0,
        mcpServers: mcpData.servers?.length || 0,
      });

      setRecentTasks(tasksData.tasks?.slice(0, 5) || []);
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
        <p>Overview of your MAS Control Agent system</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '30px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>Active Agents</div>
              <div style={{ fontSize: '32px', fontWeight: 600 }}>{stats.agents}</div>
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
              <Bot size={24} color="#f38020" />
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
              background: 'rgba(251, 191, 36, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Activity size={24} color="#fbbf24" />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>Completed</div>
              <div style={{ fontSize: '32px', fontWeight: 600 }}>{stats.completedTasks}</div>
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
              <CheckSquare size={24} color="#22c55e" />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>MCP Servers</div>
              <div style={{ fontSize: '32px', fontWeight: 600 }}>{stats.mcpServers}</div>
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
              <Server size={24} color="#3b82f6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Tasks</div>
          </div>
          {recentTasks.length > 0 ? (
            <div>
              {recentTasks.map(task => (
                <div key={task.id} style={{
                  padding: '12px',
                  borderBottom: '1px solid #333',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>{task.type}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      {new Date(task.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span className={`status-badge status-${
                    task.status === 'completed' ? 'active' :
                    task.status === 'failed' ? 'error' : 'pending'
                  }`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No recent tasks
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">System Status</div>
            <span className="status-badge status-active">Healthy</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#aaa' }}>API</span>
                <span style={{ color: '#22c55e' }}>Online</span>
              </div>
              <div style={{ height: '4px', background: '#252525', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#22c55e' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#aaa' }}>Workers</span>
                <span style={{ color: '#22c55e' }}>Active</span>
              </div>
              <div style={{ height: '4px', background: '#252525', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#22c55e' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#aaa' }}>Database</span>
                <span style={{ color: '#22c55e' }}>Connected</span>
              </div>
              <div style={{ height: '4px', background: '#252525', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#22c55e' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#aaa' }}>AI Gateway</span>
                <span style={{ color: '#22c55e' }}>Ready</span>
              </div>
              <div style={{ height: '4px', background: '#252525', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#22c55e' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
