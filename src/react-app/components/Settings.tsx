import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface CredentialGroup {
  name: string;
  category: string;
  credentials: CredentialField[];
}

interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  placeholder?: string;
  required?: boolean;
}

const CREDENTIAL_GROUPS: CredentialGroup[] = [
  {
    name: 'Cloudflare',
    category: 'cloudflare',
    credentials: [
      { key: 'CF_ACCOUNT_ID', label: 'Account ID', type: 'text', required: true },
      { key: 'CF_API_TOKEN', label: 'API Token', type: 'password', required: true },
      { key: 'CF_ZONE_ID', label: 'Zone ID (optional)', type: 'text' },
      { key: 'AI_GATEWAY_ACCOUNT_ID', label: 'AI Gateway Account ID', type: 'text', required: true },
      { key: 'AI_GATEWAY_ID', label: 'AI Gateway ID', type: 'text', required: true },
      { key: 'AI_GATEWAY_TOKEN', label: 'AI Gateway Token', type: 'password', required: true },
    ],
  },
  {
    name: 'GitHub',
    category: 'github',
    credentials: [
      { key: 'GITHUB_TOKEN', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...' },
      { key: 'GITHUB_OWNER', label: 'Default Owner/Org', type: 'text' },
    ],
  },
  {
    name: 'Slack',
    category: 'slack',
    credentials: [
      { key: 'SLACK_BOT_TOKEN', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...' },
      { key: 'SLACK_TEAM_ID', label: 'Team ID', type: 'text' },
    ],
  },
  {
    name: 'PostgreSQL',
    category: 'database',
    credentials: [
      { key: 'POSTGRES_CONNECTION_STRING', label: 'Connection String', type: 'password', placeholder: 'postgresql://user:pass@host:5432/db' },
      { key: 'POSTGRES_HOST', label: 'Host', type: 'text' },
      { key: 'POSTGRES_PORT', label: 'Port', type: 'text', placeholder: '5432' },
      { key: 'POSTGRES_DATABASE', label: 'Database', type: 'text' },
      { key: 'POSTGRES_USER', label: 'User', type: 'text' },
      { key: 'POSTGRES_PASSWORD', label: 'Password', type: 'password' },
    ],
  },
  {
    name: 'MySQL',
    category: 'database',
    credentials: [
      { key: 'MYSQL_CONNECTION_STRING', label: 'Connection String', type: 'password', placeholder: 'mysql://user:pass@host:3306/db' },
    ],
  },
  {
    name: 'MongoDB',
    category: 'database',
    credentials: [
      { key: 'MONGODB_URI', label: 'Connection URI', type: 'password', placeholder: 'mongodb://...' },
    ],
  },
  {
    name: 'Redis',
    category: 'database',
    credentials: [
      { key: 'REDIS_URL', label: 'Connection URL', type: 'password', placeholder: 'redis://...' },
      { key: 'REDIS_HOST', label: 'Host', type: 'text' },
      { key: 'REDIS_PORT', label: 'Port', type: 'text', placeholder: '6379' },
      { key: 'REDIS_PASSWORD', label: 'Password', type: 'password' },
    ],
  },
  {
    name: 'AWS',
    category: 'cloud',
    credentials: [
      { key: 'AWS_ACCESS_KEY_ID', label: 'Access Key ID', type: 'text' },
      { key: 'AWS_SECRET_ACCESS_KEY', label: 'Secret Access Key', type: 'password' },
      { key: 'AWS_REGION', label: 'Region', type: 'text', placeholder: 'us-east-1' },
      { key: 'AWS_KB_ID', label: 'Knowledge Base ID', type: 'text' },
    ],
  },
  {
    name: 'Azure',
    category: 'cloud',
    credentials: [
      { key: 'AZURE_CLIENT_ID', label: 'Client ID', type: 'text' },
      { key: 'AZURE_CLIENT_SECRET', label: 'Client Secret', type: 'password' },
      { key: 'AZURE_TENANT_ID', label: 'Tenant ID', type: 'text' },
      { key: 'AZURE_SUBSCRIPTION_ID', label: 'Subscription ID', type: 'text' },
    ],
  },
  {
    name: 'Google Cloud',
    category: 'cloud',
    credentials: [
      { key: 'GCP_PROJECT_ID', label: 'Project ID', type: 'text' },
      { key: 'GCP_SERVICE_ACCOUNT_KEY', label: 'Service Account Key (JSON)', type: 'password' },
    ],
  },
  {
    name: 'Kubernetes',
    category: 'orchestration',
    credentials: [
      { key: 'KUBERNETES_CLUSTER_URL', label: 'Cluster URL', type: 'url' },
      { key: 'KUBERNETES_TOKEN', label: 'Auth Token', type: 'password' },
      { key: 'KUBECONFIG', label: 'Kubeconfig (base64)', type: 'password' },
    ],
  },
  {
    name: 'GitLab',
    category: 'vcs',
    credentials: [
      { key: 'GITLAB_TOKEN', label: 'Personal Access Token', type: 'password' },
      { key: 'GITLAB_URL', label: 'GitLab URL', type: 'url', placeholder: 'https://gitlab.com' },
    ],
  },
  {
    name: 'Linear',
    category: 'project',
    credentials: [
      { key: 'LINEAR_API_KEY', label: 'API Key', type: 'password' },
    ],
  },
  {
    name: 'Jira',
    category: 'project',
    credentials: [
      { key: 'JIRA_URL', label: 'Jira URL', type: 'url', placeholder: 'https://your-domain.atlassian.net' },
      { key: 'JIRA_EMAIL', label: 'Email', type: 'text' },
      { key: 'JIRA_API_TOKEN', label: 'API Token', type: 'password' },
    ],
  },
  {
    name: 'Discord',
    category: 'communication',
    credentials: [
      { key: 'DISCORD_BOT_TOKEN', label: 'Bot Token', type: 'password' },
      { key: 'DISCORD_GUILD_ID', label: 'Guild/Server ID', type: 'text' },
    ],
  },
  {
    name: 'Email (SMTP)',
    category: 'communication',
    credentials: [
      { key: 'SMTP_HOST', label: 'SMTP Host', type: 'text' },
      { key: 'SMTP_PORT', label: 'SMTP Port', type: 'text', placeholder: '587' },
      { key: 'SMTP_USER', label: 'Username', type: 'text' },
      { key: 'SMTP_PASSWORD', label: 'Password', type: 'password' },
      { key: 'SMTP_FROM', label: 'From Address', type: 'text' },
    ],
  },
  {
    name: 'Notion',
    category: 'productivity',
    credentials: [
      { key: 'NOTION_TOKEN', label: 'Integration Token', type: 'password' },
      { key: 'NOTION_DATABASE_ID', label: 'Database ID', type: 'text' },
    ],
  },
  {
    name: 'Airtable',
    category: 'productivity',
    credentials: [
      { key: 'AIRTABLE_API_KEY', label: 'API Key', type: 'password' },
      { key: 'AIRTABLE_BASE_ID', label: 'Base ID', type: 'text' },
    ],
  },
  {
    name: 'Search APIs',
    category: 'search',
    credentials: [
      { key: 'BRAVE_API_KEY', label: 'Brave Search API Key', type: 'password' },
      { key: 'GOOGLE_API_KEY', label: 'Google API Key', type: 'password' },
      { key: 'GOOGLE_CX', label: 'Google Custom Search Engine ID', type: 'text' },
      { key: 'TAVILY_API_KEY', label: 'Tavily API Key', type: 'password' },
      { key: 'EXA_API_KEY', label: 'Exa API Key', type: 'password' },
    ],
  },
  {
    name: 'Shopify',
    category: 'ecommerce',
    credentials: [
      { key: 'SHOPIFY_SHOP_URL', label: 'Shop URL', type: 'url', placeholder: 'https://your-shop.myshopify.com' },
      { key: 'SHOPIFY_ACCESS_TOKEN', label: 'Access Token', type: 'password' },
    ],
  },
  {
    name: 'Stripe',
    category: 'payments',
    credentials: [
      { key: 'STRIPE_API_KEY', label: 'Secret Key', type: 'password', placeholder: 'sk_...' },
      { key: 'STRIPE_PUBLISHABLE_KEY', label: 'Publishable Key', type: 'text', placeholder: 'pk_...' },
    ],
  },
  {
    name: 'YouTube',
    category: 'media',
    credentials: [
      { key: 'YOUTUBE_API_KEY', label: 'API Key', type: 'password' },
    ],
  },
  {
    name: 'Twitter/X',
    category: 'social',
    credentials: [
      { key: 'TWITTER_API_KEY', label: 'API Key', type: 'text' },
      { key: 'TWITTER_API_SECRET', label: 'API Secret', type: 'password' },
      { key: 'TWITTER_BEARER_TOKEN', label: 'Bearer Token', type: 'password' },
    ],
  },
  {
    name: 'Monitoring',
    category: 'monitoring',
    credentials: [
      { key: 'SENTRY_AUTH_TOKEN', label: 'Sentry Auth Token', type: 'password' },
      { key: 'SENTRY_ORG', label: 'Sentry Organization', type: 'text' },
      { key: 'DATADOG_API_KEY', label: 'Datadog API Key', type: 'password' },
      { key: 'DATADOG_APP_KEY', label: 'Datadog App Key', type: 'password' },
    ],
  },
];

export default function Settings() {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const res = await fetch('/api/settings/credentials');
      const data = await res.json();
      if (data.success) {
        setCredentials(data.credentials || {});
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  };

  const handleChange = (key: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const togglePasswordVisibility = (key: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Credentials saved successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save credentials' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save credentials' });
    }

    setSaving(false);
    setTimeout(() => setMessage(null), 5000);
  };

  const categories = ['all', ...new Set(CREDENTIAL_GROUPS.map(g => g.category))];
  const filteredGroups = activeCategory === 'all'
    ? CREDENTIAL_GROUPS
    : CREDENTIAL_GROUPS.filter(g => g.category === activeCategory);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p>Manage MCP server credentials and configuration</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '20px',
          borderRadius: '6px',
          background: message.type === 'success' ? '#22c55e20' : '#ef444420',
          border: `1px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: message.type === 'success' ? '#22c55e' : '#ef4444',
          fontSize: '14px',
        }}>
          {message.text}
        </div>
      )}

      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`btn ${activeCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '12px', textTransform: 'capitalize' }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-1">
        {filteredGroups.map(group => (
          <div key={group.name} className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <SettingsIcon size={20} />
                <div>
                  <div className="card-title">{group.name}</div>
                  <div style={{ fontSize: '11px', color: '#666', textTransform: 'capitalize' }}>
                    {group.category}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              {group.credentials.map(field => (
                <div key={field.key}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    color: '#aaa',
                    marginBottom: '6px',
                  }}>
                    {field.label}
                    {field.required && <span style={{ color: '#f38020' }}> *</span>}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={field.type === 'password' && !visiblePasswords.has(field.key) ? 'password' : 'text'}
                      value={credentials[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '13px',
                        paddingRight: field.type === 'password' ? '40px' : '12px',
                      }}
                    />
                    {field.type === 'password' && (
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(field.key)}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: '#666',
                        }}
                      >
                        {visiblePasswords.has(field.key) ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <SettingsIcon size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ color: '#666' }}>No settings found in this category</p>
        </div>
      )}
    </div>
  );
}
