import { useState, useEffect } from 'react';
import { FileText, Search, Trash2, Upload, BarChart } from 'lucide-react';

export default function RAGManager() {
  const [activeTab, setActiveTab] = useState('upload');
  const [documents, setDocuments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploadContent, setUploadContent] = useState('');
  const [uploadType, setUploadType] = useState<'code' | 'documentation' | 'api_response' | 'user_note'>('documentation');
  const [uploadMetadata, setUploadMetadata] = useState('');

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const res = await fetch('/api/rag-service/statistics');
      const data = await res.json();
      setStatistics(data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const uploadDocument = async () => {
    if (!uploadContent.trim()) return;

    setLoading(true);
    try {
      const metadata = uploadMetadata.trim() ? JSON.parse(uploadMetadata) : {};
      const res = await fetch('/api/rag-service/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: crypto.randomUUID(),
          documentType: uploadType,
          content: uploadContent,
          metadata,
        }),
      });

      const result = await res.json();

      if (result.success) {
        alert(`Document loaded: ${result.chunksCreated} chunks, ${result.embeddingsGenerated} embeddings`);
        setUploadContent('');
        setUploadMetadata('');
        loadStatistics();
      } else {
        alert('Failed to upload document');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const searchDocuments = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/rag-service/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          topK: 10,
        }),
      });

      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderUpload = () => (
    <div>
      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Upload Document to RAG</h3>

        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aaa' }}>
          Document Type
        </label>
        <select
          value={uploadType}
          onChange={(e) => setUploadType(e.target.value as any)}
          className="input"
          style={{ marginBottom: '16px' }}
        >
          <option value="code">Code</option>
          <option value="documentation">Documentation</option>
          <option value="api_response">API Response</option>
          <option value="user_note">User Note</option>
        </select>

        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aaa' }}>
          Content
        </label>
        <textarea
          value={uploadContent}
          onChange={(e) => setUploadContent(e.target.value)}
          placeholder="Paste your document content here..."
          className="input"
          style={{ minHeight: '200px', marginBottom: '16px', fontFamily: 'monospace' }}
        />

        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aaa' }}>
          Metadata (JSON, optional)
        </label>
        <textarea
          value={uploadMetadata}
          onChange={(e) => setUploadMetadata(e.target.value)}
          placeholder='{"title": "API Guide", "version": "1.0"}'
          className="input"
          style={{ minHeight: '80px', marginBottom: '16px', fontFamily: 'monospace' }}
        />

        <button
          onClick={uploadDocument}
          className="btn btn-primary"
          disabled={loading || !uploadContent.trim()}
        >
          <Upload size={16} />
          {loading ? 'Uploading...' : 'Upload Document'}
        </button>
      </div>
    </div>
  );

  const renderSearch = () => (
    <div>
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '16px' }}>Semantic Search</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchDocuments()}
            placeholder="Search for anything..."
            className="input"
            style={{ flex: 1 }}
          />
          <button
            onClick={searchDocuments}
            className="btn btn-primary"
            disabled={loading || !searchQuery.trim()}
          >
            <Search size={16} />
            Search
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div>
          <h3 style={{ marginBottom: '16px' }}>Results ({searchResults.length})</h3>
          {searchResults.map((result, idx) => (
            <div key={idx} className="card" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <div>
                  <span className="status-badge" style={{ background: '#333' }}>
                    {result.chunk.document_type}
                  </span>
                  <span style={{ marginLeft: '8px', fontSize: '13px', color: '#888' }}>
                    Score: {(result.score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <pre style={{
                background: '#1a1a1a',
                padding: '12px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '13px',
                lineHeight: '1.5',
                margin: 0,
              }}>
                {result.chunk.content}
              </pre>
              {result.chunk.metadata && Object.keys(result.chunk.metadata).length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                  {JSON.stringify(result.chunk.metadata)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStatistics = () => (
    <div>
      {statistics && (
        <div className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <FileText size={20} />
              <div className="card-title">Total Documents</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 600, color: '#f38020' }}>
              {statistics.totalDocuments}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <FileText size={20} />
              <div className="card-title">Total Chunks</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 600, color: '#f38020' }}>
              {statistics.totalChunks}
            </div>
          </div>

          {statistics.chunksByType && Object.entries(statistics.chunksByType).map(([type, count]) => (
            <div key={type} className="card">
              <div className="card-header">
                <FileText size={20} />
                <div className="card-title">{type}</div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 600 }}>
                {count as number} chunks
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>RAG Manager</h2>
          <p>Manage documents and semantic search</p>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #333' }}>
          {[
            { id: 'upload', label: 'Upload', icon: <Upload size={16} /> },
            { id: 'search', label: 'Search', icon: <Search size={16} /> },
            { id: 'statistics', label: 'Statistics', icon: <BarChart size={16} /> },
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

        {activeTab === 'upload' && renderUpload()}
        {activeTab === 'search' && renderSearch()}
        {activeTab === 'statistics' && renderStatistics()}
      </div>
    </div>
  );
}
