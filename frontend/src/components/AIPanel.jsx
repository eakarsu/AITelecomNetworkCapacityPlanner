import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

function StructuredResult({ analysis }) {
  if (!analysis || typeof analysis !== 'object') return null;

  const renderList = (arr, label) => {
    if (!arr || !arr.length) return null;
    return (
      <div style={{ marginBottom: '12px' }}>
        <strong style={{ color: 'var(--accent)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</strong>
        <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
          {arr.map((item, i) => (
            <li key={i} style={{ color: 'var(--text-primary)', fontSize: '13px', marginBottom: '4px' }}>
              {typeof item === 'string' ? item : JSON.stringify(item)}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderTable = (arr, label) => {
    if (!arr || !arr.length) return null;
    const keys = Object.keys(arr[0]);
    return (
      <div style={{ marginBottom: '12px' }}>
        <strong style={{ color: 'var(--accent)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</strong>
        <div style={{ overflowX: 'auto', marginTop: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                {keys.map(k => (
                  <th key={k} style={{ background: 'var(--bg-tertiary)', padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
                    {k.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {arr.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  {keys.map(k => (
                    <td key={k} style={{ padding: '5px 8px', color: 'var(--text-primary)' }}>
                      {row[k] != null ? String(row[k]) : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const { findings, recommendations, priority_actions, ...rest } = analysis;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {renderList(findings, 'Findings')}
      {renderList(recommendations, 'Recommendations')}
      {renderList(priority_actions, 'Priority Actions')}
      {Object.entries(rest).map(([key, val]) => {
        if (val == null) return null;
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
          return renderTable(val, key.replace(/_/g, ' '));
        }
        if (Array.isArray(val)) return renderList(val, key.replace(/_/g, ' '));
        if (typeof val === 'object') return (
          <div key={key} style={{ marginBottom: '8px' }}>
            <strong style={{ color: 'var(--accent)', fontSize: '13px', textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</strong>
            <pre style={{ background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-primary)', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{JSON.stringify(val, null, 2)}</pre>
          </div>
        );
        return (
          <div key={key} style={{ marginBottom: '6px', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>{key.replace(/_/g, ' ')}: </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{String(val)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AIPanel({ title, onAnalyze, result, loading }) {
  const [question, setQuestion] = useState('');

  const handleAnalyze = () => {
    onAnalyze(question);
  };

  const isStructured = result && result.analysis && typeof result.analysis === 'object';
  const isText = result && result.analysis && typeof result.analysis === 'string';

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <h3>
          <span style={{ fontSize: '20px' }}>&#9883;</span> AI Analysis: {title}
        </h3>
        {result && (
          <span className="badge badge-active">Analysis Complete</span>
        )}
      </div>
      <div className="ai-panel-body">
        <div className="ai-question-input">
          <input
            className="form-control"
            placeholder="Ask a specific question (optional)..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          />
          <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading}>
            {loading ? (
              <><span className="loading-spinner"></span> Analyzing...</>
            ) : (
              <><span style={{ fontSize: '16px' }}>&#9883;</span> Run AI Analysis</>
            )}
          </button>
        </div>

        {loading && (
          <div className="ai-loading">
            <div className="dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              AI is analyzing your data...
            </p>
          </div>
        )}

        {result && !loading && (
          <>
            <div className="ai-result">
              {isStructured && <StructuredResult analysis={result.analysis} />}
              {isText && <ReactMarkdown>{result.analysis}</ReactMarkdown>}
            </div>
            <div className="ai-meta">
              <span>Model: {result.model}</span>
              {result.usage && (
                <>
                  <span>Tokens: {result.usage.total_tokens}</span>
                  <span>Prompt: {result.usage.prompt_tokens} | Completion: {result.usage.completion_tokens}</span>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
