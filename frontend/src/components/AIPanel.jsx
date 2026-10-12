import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import AIReport from './AIReport';

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
        <div className="ai-actions" aria-label="Analysis question examples">
          {[
            'Which capacity constraints need attention first, and what evidence supports that order?',
            'What changes in demand or utilization should we monitor over the next month?',
            'Which assumptions and missing measurements could change the recommendation?',
          ].map((sample, index) => <button key={sample} type="button" className="btn btn-secondary" disabled={loading} onClick={() => setQuestion(sample)}>Question {index + 1}</button>)}
        </div>
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
              {isStructured && <AIReport response={result.analysis} title={title} model={result.model} tokens={result.usage} />}
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
