import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function AIPanel({ title, onAnalyze, result, loading }) {
  const [question, setQuestion] = useState('');

  const handleAnalyze = () => {
    onAnalyze(question);
  };

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
              <ReactMarkdown>{result.analysis}</ReactMarkdown>
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
