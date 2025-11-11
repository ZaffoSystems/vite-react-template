import { useState, useEffect } from 'react';
import { Plus, Activity, Brain, Zap, Cog } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  type: 'utility' | 'learning' | 'dynamic' | 'react' | 'infrastructure';
  status?: string;
  capabilities: any;
  model?: string;
}

export default function AgentManagement() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'utility' as Agent['type'],
    model: '@cf/meta/llama-3.1-8b-instruct-fast',
    temperature: 0.7,
    maxTokens: 2048,
    capabilities: {
      canManageInfrastructure: false,
      canDeployWorkers: false,
      canAccessSSH: false,
      canQueryRAG: true,
      canLearn: false,
      canReact: false,
      canSyncDocker: false,
      canUseMCP: true,
    },
  });

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
    setLoading(false);
  };

  const createAgent = async () => {
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowCreateModal(false);
        loadAgents();
        // Reset form
        setFormData({
          name: '',
          type: 'utility',
          model: '@cf/meta/llama-3.1-8b-instruct-fast',
          temperature: 0.7,
          maxTokens: 2048,
          capabilities: {
            canManageInfrastructure: false,
            canDeployWorkers: false,
            canAccessSSH: false,
            canQueryRAG: true,
            canLearn: false,
            canReact: false,
            canSyncDocker: false,
            canUseMCP: true,
          },
        });
      }
    } catch (error) {
      console.error('Failed to create agent:', error);
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'utility': return <Cog />;
      case 'learning': return <Brain />;
      case 'dynamic': return <Zap />;
      case 'react': return <Activity />;
      case 'infrastructure': return <Cog />;
      default: return <Cog />;
    }
  };

  const getStatusBadge = (status: string = 'idle') => {
    const classes = {
      idle: 'status-idle',
      active: 'status-active',
      error: 'status-error',
    };
    return <span className={`status-badge ${classes[status as keyof typeof classes] || 'status-idle'}`}>{status}</span>;
  };

  if (loading) {
    return <div className="loading">Loading agents...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Agent Management</h2>
          <p>Create and manage your multi-agent system</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus />
          Create Agent
        </button>
      </div>

      <div className="grid grid-3">
        {agents.map(agent => (
          <div key={agent.id} className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {getAgentIcon(agent.type)}
                <div>
                  <div className="card-title">{agent.name}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{agent.type}</div>
                </div>
              </div>
              {getStatusBadge(agent.status)}
            </div>
            <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '16px' }}>
              Model: {agent.model || 'Default'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.entries(agent.capabilities).filter(([_, v]) => v).map(([key]) => (
                <span key={key} style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  background: '#252525',
                  borderRadius: '4px',
                  color: '#888',
                }}>
                  {key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <Brain size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ color: '#666' }}>No agents created yet. Create your first agent to get started.</p>
        </div>
      )}

      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ width: '600px', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: '24px' }}>Create New Agent</h3>

            <div className="input-group">
              <label>Agent Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Agent"
              />
            </div>

            <div className="input-group">
              <label>Agent Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Agent['type'] })}
              >
                <option value="utility">Utility - General purpose tasks</option>
                <option value="learning">Learning - Learns from feedback</option>
                <option value="dynamic">Dynamic - Adapts model selection</option>
                <option value="react">React - Reasoning + Action loops</option>
                <option value="infrastructure">Infrastructure - Manages CF resources</option>
              </select>
            </div>

            <div className="input-group">
              <label>Model</label>
              <select
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              >
                <option value="@cf/meta/llama-3.1-8b-instruct-fast">Llama 3.1 8B (Fast)</option>
                <option value="@cf/meta/llama-3.1-8b-instruct">Llama 3.1 8B</option>
                <option value="@cf/meta/llama-3-8b-instruct">Llama 3 8B</option>
                <option value="@cf/mistral/mistral-7b-instruct-v0.1">Mistral 7B</option>
              </select>
            </div>

            <div className="grid grid-2">
              <div className="input-group">
                <label>Temperature</label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                />
              </div>
              <div className="input-group">
                <label>Max Tokens</label>
                <input
                  type="number"
                  min="100"
                  max="4096"
                  step="100"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Capabilities</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {Object.entries(formData.capabilities).map(([key, value]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setFormData({
                        ...formData,
                        capabilities: {
                          ...formData.capabilities,
                          [key]: e.target.checked,
                        },
                      })}
                    />
                    <span style={{ fontSize: '13px' }}>
                      {key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={createAgent} className="btn btn-primary">
                Create Agent
              </button>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
