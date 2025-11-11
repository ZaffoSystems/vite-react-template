import React, { useState, useEffect } from "react";
import "./App.css";

interface Agent {
  id: string;
  description: string;
  status: string;
  mcpServers: string[];
}

const API_BASE = "/api";

function App() {
  const [message, setMessage] = useState("");
  const [sessionId] = useState(() => Math.random().toString(36).substr(2, 8));
  const [agents, setAgents] = useState<Agent[]>([]);
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Fetch initial agent list
    fetch(`${API_BASE}/meta/agents`)
      .then((res) => res.json())
      .then((data) => setAgents(data.agents || []))
      .catch(() => setAgents([]));
  }, []);

  const handleAgentCreate = async () => {
    if (!message.trim()) return;
    setIsCreating(true);
    setError("");
    setChatLog((l) => [
      ...l,
      `You: ${message}`,
      "System: Creating agent..."
    ]);
    try {
      const res = await fetch(`${API_BASE}/meta/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId })
      });
      const data = await res.json();
      setChatLog((l) => [
        ...l.slice(0, -1),
        `System: ${data.response || "Agent created."}`
      ]);
      // Refetch agent list
      fetch(`${API_BASE}/meta/agents`)
        .then((res) => res.json())
        .then((data) => setAgents(data.agents || []));
    } catch {
      setError("Failed to create agent");
    }
    setIsCreating(false);
    setMessage("");
  };

  return (
    <div className="container">
      <h1>Multi-Agent MCP System</h1>
      <section>
        <h2>Natural Language Agent Creation</h2>
        <div className="chatbox">
          <textarea
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the agent you want to create..."
          />
          <button disabled={isCreating} onClick={handleAgentCreate}>
            {isCreating ? "Creating..." : "Create Agent"}
          </button>
          {error && <div className="error">{error}</div>}
          <div className="chatlog">
            {chatLog.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        </div>
      </section>
      <section>
        <h2>Agent Dashboard</h2>
        <table className="agent-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Description</th>
              <th>Status</th>
              <th>MCP Servers</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id}>
                <td>{agent.id}</td>
                <td>{agent.description || "-"}</td>
                <td>{agent.status}</td>
                <td>{agent.mcpServers?.join(", ") || "-"}</td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={4}>No agents found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      <section>
        <h2>System API Endpoints</h2>
        <ul>
          <li>POST /api/meta/chat — Create agent from description</li>
          <li>GET /api/meta/agents — List all agents</li>
          <li>POST /api/executor/&lt;agentId&gt;/execute — Run task</li>
        </ul>
      </section>
    </div>
  );
}

export default App;