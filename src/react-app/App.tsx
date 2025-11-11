import React, { useState, useEffect } from "react";
import CredentialManager from "./CredentialManager";
import "./App.css";

interface Agent {
  id: string;
  description: string;
  status: string;
  mcpServers: string[];
}

interface CredentialMetadata {
  label: string;
  createdAt: string;
  updatedAt: string;
  usedBy: string[];
}

const API_BASE = "/api";

function App() {
  const [message, setMessage] = useState("");
  const [sessionId] = useState(() => Math.random().toString(36).substr(2, 8));
  const [agents, setAgents] = useState<Agent[]>([]);
  const [credentials, setCredentials] = useState<CredentialMetadata[]>([]);
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"agents" | "credentials">("agents");

  useEffect(() => {
    // Fetch initial agent list
    fetch(`${API_BASE}/meta/agents`)
      .then((res) => res.json())
      .then((data) => setAgents(data.agents || []))
      .catch(() => setAgents([]));
    
    // Fetch credentials list
    fetchCredentials();
  }, []);

  const fetchCredentials = () => {
    fetch(`${API_BASE}/credentials`)
      .then((res) => res.json())
      .then((data) => setCredentials(data.credentials || []))
      .catch(() => setCredentials([]));
  };

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

  const handleDeleteCredential = async (label: string) => {
    if (!confirm(`Delete credential "${label}"?`)) return;
    try {
      await fetch(`${API_BASE}/credentials/${label}`, { method: "DELETE" });
      fetchCredentials();
    } catch {
      alert("Failed to delete credential");
    }
  };

  return (
    <div className="container">
      <h1>🤖 Ultra Multi-Agent MCP System</h1>
      
      <div className="tabs">
        <button 
          className={activeTab === "agents" ? "active" : ""}
          onClick={() => setActiveTab("agents")}
        >
          Agents
        </button>
        <button 
          className={activeTab === "credentials" ? "active" : ""}
          onClick={() => setActiveTab("credentials")}
        >
          Credentials
        </button>
      </div>

      {activeTab === "agents" && (
        <>
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
        </>
      )}

      {activeTab === "credentials" && (
        <>
          <section>
            <CredentialManager onCredentialAdded={fetchCredentials} />
          </section>
          <section>
            <h2>Stored Credentials</h2>
            <table className="agent-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Created</th>
                  <th>Used By Agents</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((cred) => (
                  <tr key={cred.label}>
                    <td>{cred.label}</td>
                    <td>{new Date(cred.createdAt).toLocaleString()}</td>
                    <td>{cred.usedBy?.length || 0} agent(s)</td>
                    <td>
                      <button onClick={() => handleDeleteCredential(cred.label)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {credentials.length === 0 && (
                  <tr>
                    <td colSpan={4}>No credentials stored.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}

      <section>
        <h2>System Information</h2>
        <ul>
          <li>25+ MCP Servers integrated</li>
          <li>Natural language agent creation</li>
          <li>Secure credential management</li>
          <li>Multi-agent orchestration</li>
        </ul>
      </section>
    </div>
  );
}

export default App;
