import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { MessageSquare, Bot, CheckSquare, Server, Database, Cloud, Settings as SettingsIcon } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import AgentManagement from './components/AgentManagement';
import TaskMonitor from './components/TaskMonitor';
import InfrastructureControl from './components/InfrastructureControl';
import MCPServers from './components/MCPServers';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="sidebar">
          <div className="logo">
            <Cloud className="logo-icon" />
            <h1>MAS Control</h1>
          </div>

          <div className="nav-links">
            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
              <Server />
              <span>Dashboard</span>
            </NavLink>

            <NavLink to="/chat" className={({ isActive }) => isActive ? 'active' : ''}>
              <MessageSquare />
              <span>Chat</span>
            </NavLink>

            <NavLink to="/agents" className={({ isActive }) => isActive ? 'active' : ''}>
              <Bot />
              <span>Agents</span>
            </NavLink>

            <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : ''}>
              <CheckSquare />
              <span>Tasks</span>
            </NavLink>

            <NavLink to="/infrastructure" className={({ isActive }) => isActive ? 'active' : ''}>
              <Database />
              <span>Infrastructure</span>
            </NavLink>

            <NavLink to="/mcp" className={({ isActive }) => isActive ? 'active' : ''}>
              <Server />
              <span>MCP Servers</span>
            </NavLink>

            <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
              <SettingsIcon />
              <span>Settings</span>
            </NavLink>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<ChatInterface />} />
            <Route path="/agents" element={<AgentManagement />} />
            <Route path="/tasks" element={<TaskMonitor />} />
            <Route path="/infrastructure" element={<InfrastructureControl />} />
            <Route path="/mcp" element={<MCPServers />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
