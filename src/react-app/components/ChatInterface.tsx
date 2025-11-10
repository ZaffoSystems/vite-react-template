import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [agents, setAgents] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
      if (data.agents?.length > 0) {
        setSelectedAgent(data.agents[0].id);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedAgent) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Create task for agent
      const taskRes = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          agentId: selectedAgent,
          payload: { message: input },
          priority: 1,
        }),
      });

      const { taskId } = await taskRes.json();

      // Poll for result
      let attempts = 0;
      const maxAttempts = 60;

      const pollResult = setInterval(async () => {
        attempts++;

        if (attempts > maxAttempts) {
          clearInterval(pollResult);
          setLoading(false);
          const errorMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Request timed out. Please try again.',
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, errorMessage]);
          return;
        }

        const statusRes = await fetch(`/api/tasks/${taskId}`);
        const task = await statusRes.json();

        if (task.status === 'completed') {
          clearInterval(pollResult);
          setLoading(false);

          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: task.result?.response || JSON.stringify(task.result),
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, assistantMessage]);
        } else if (task.status === 'failed') {
          clearInterval(pollResult);
          setLoading(false);

          const errorMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Error: ${task.error}`,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      }, 1000);
    } catch (error: any) {
      setLoading(false);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <h2>Chat with Agent</h2>
        <p>Natural language interface to communicate with your agents</p>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <div className="card-title">Conversation</div>
          <div className="input-group" style={{ marginBottom: 0, width: '250px' }}>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">Select Agent</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          marginBottom: '20px',
          padding: '20px',
          background: '#0f0f0f',
          borderRadius: '8px',
        }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
              <Bot size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>Start a conversation with your agent</p>
            </div>
          )}

          {messages.map(message => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '20px',
                alignItems: 'flex-start',
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: message.role === 'user' ? '#333' : '#f38020',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {message.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  background: message.role === 'user' ? '#1a1a1a' : '#252525',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  color: '#fff',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {message.content}
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '20px',
              alignItems: 'flex-start',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#f38020',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Bot size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  background: '#252525',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  color: '#888',
                }}>
                  Thinking...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            style={{
              flex: 1,
              minHeight: '60px',
              maxHeight: '200px',
              padding: '12px',
              background: '#0f0f0f',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              resize: 'vertical',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || !selectedAgent}
            className="btn btn-primary"
            style={{
              height: '60px',
              alignSelf: 'flex-end',
            }}
          >
            <Send />
          </button>
        </div>
      </div>
    </div>
  );
}
