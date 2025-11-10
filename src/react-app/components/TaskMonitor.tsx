import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface Task {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  payload: any;
  result?: any;
  error?: string;
  created_at: number;
  completed_at?: number;
}

export default function TaskMonitor() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 3000); // Refresh every 3s
    return () => clearInterval(interval);
  }, [filter]);

  const loadTasks = async () => {
    try {
      const url = filter === 'all' ? '/api/tasks' : `/api/tasks?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} color="#22c55e" />;
      case 'failed': return <XCircle size={16} color="#ef4444" />;
      case 'processing': return <RefreshCw size={16} color="#fbbf24" className="spin" />;
      default: return <Clock size={16} color="#888" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      pending: 'status-pending',
      processing: 'status-pending',
      completed: 'status-active',
      failed: 'status-error',
    };
    return <span className={`status-badge ${classes[status as keyof typeof classes]}`}>{status}</span>;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getDuration = (created: number, completed?: number) => {
    if (!completed) return '-';
    const duration = completed - created;
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return <div className="loading">Loading tasks...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Task Monitor</h2>
          <p>Monitor all agent tasks in real-time</p>
        </div>
        <button onClick={loadTasks} className="btn btn-secondary">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Tasks</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'pending', 'processing', 'completed', 'failed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No tasks found
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Created</th>
                <th>Duration</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getStatusIcon(task.status)}
                      {getStatusBadge(task.status)}
                    </div>
                  </td>
                  <td>{task.type}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      background: task.priority > 5 ? '#fbbf24' : '#333',
                      borderRadius: '4px',
                      fontSize: '11px',
                    }}>
                      {task.priority}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: '#888' }}>
                    {formatTime(task.created_at)}
                  </td>
                  <td style={{ fontSize: '12px' }}>
                    {getDuration(task.created_at, task.completed_at)}
                  </td>
                  <td>
                    {task.status === 'completed' && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => {
                          alert(JSON.stringify(task.result, null, 2));
                        }}
                      >
                        View
                      </button>
                    )}
                    {task.status === 'failed' && (
                      <span style={{ color: '#ef4444', fontSize: '12px' }}>
                        {task.error || 'Unknown error'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
