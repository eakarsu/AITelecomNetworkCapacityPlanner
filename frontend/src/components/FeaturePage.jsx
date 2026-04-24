import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAll, createItem, updateItem, deleteItem, aiAnalyze } from '../api';
import Modal from './Modal';
import AIPanel from './AIPanel';

const ROWS_PER_PAGE = 15;

export default function FeaturePage({ config }) {
  const {
    title, subtitle, endpoint, aiEndpoint, aiTitle,
    columns, formFields, icon, detailFields,
  } = config;

  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [search, setSearch] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Sorting state
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAll(endpoint);
      setItems(data);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reset page and selections when search changes
  useEffect(() => { setCurrentPage(1); }, [search]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setShowDetail(true);
  };

  const handleNew = () => {
    setEditItem(null);
    const initial = {};
    formFields.forEach(f => { initial[f.name] = f.default || ''; });
    setFormData(initial);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    const data = {};
    formFields.forEach(f => {
      let val = item[f.name];
      if (f.type === 'date' && val) val = val.split('T')[0];
      if (f.type === 'datetime-local' && val) val = val.slice(0, 16);
      data[f.name] = val ?? '';
    });
    setFormData(data);
    setShowForm(true);
    setShowDetail(false);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteItem(endpoint, item.id);
      showToast('success', 'Deleted successfully');
      setShowDetail(false);
      setSelectedItem(null);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convert numeric fields
      const submitData = { ...formData };
      formFields.forEach(f => {
        if (f.type === 'number' && submitData[f.name] !== '') {
          submitData[f.name] = Number(submitData[f.name]);
        }
      });
      if (editItem) {
        await updateItem(endpoint, editItem.id, submitData);
        showToast('success', 'Updated successfully');
      } else {
        await createItem(endpoint, submitData);
        showToast('success', 'Created successfully');
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleAiAnalyze = async (question) => {
    setAiLoading(true);
    try {
      const result = await aiAnalyze(aiEndpoint, question);
      setAiResult(result);
    } catch (err) {
      showToast('error', 'AI Analysis failed: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Filtering
  const filteredItems = useMemo(() => {
    return items.filter(item =>
      Object.values(item).some(v =>
        String(v).toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [items, search]);

  // Sorting
  const sortedItems = useMemo(() => {
    if (!sortKey) return filteredItems;
    return [...filteredItems].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredItems, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = sortedItems.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (sortedItems.length === 0) return;
    const headers = columns.map(c => c.label);
    const rows = sortedItems.map(item =>
      columns.map(col => {
        const val = item[col.key];
        if (val == null) return '';
        const str = String(val);
        // Escape quotes and wrap in quotes if contains comma/quote/newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
    );
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${endpoint}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Bulk selection
  const handleCheckboxChange = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(paginatedItems.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected item(s)?`)) return;
    try {
      await Promise.all([...selectedIds].map(id => deleteItem(endpoint, id)));
      showToast('success', `Deleted ${selectedIds.size} item(s)`);
      setSelectedIds(new Set());
      setShowDetail(false);
      setSelectedItem(null);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const allOnPageSelected = paginatedItems.length > 0 && paginatedItems.every(item => selectedIds.has(item.id));

  const formatValue = (val, col) => {
    if (val == null) return '-';
    if (col.badge) {
      const cls = `badge badge-${String(val).replace(/\s/g, '_')}`;
      return <span className={cls}>{val}</span>;
    }
    if (col.format === 'number') return Number(val).toLocaleString();
    if (col.format === 'decimal') return Number(val).toFixed(2);
    if (col.format === 'percent') return `${Number(val).toFixed(1)}%`;
    if (col.format === 'date') return val ? new Date(val).toLocaleDateString() : '-';
    if (col.format === 'currency') return `$${Number(val).toLocaleString()}`;
    return String(val);
  };

  return (
    <div>
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}

      <div className="back-link" onClick={() => navigate('/')}>
        &#8592; Back to Dashboard
      </div>

      <div className="page-header">
        <div>
          <h2>{icon} {title}</h2>
          <p className="subtitle">{subtitle}</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>
          + New {title.replace(/s$/, '').replace(/Management|Monitoring|Analysis|Forecasting|Balancing/g, '').trim()}
        </button>
      </div>

      {/* Detail Panel */}
      {showDetail && selectedItem && (
        <div className="detail-panel">
          <div className="detail-header">
            <div>
              <h3>{selectedItem.name}</h3>
              <span className="badge" style={{ marginTop: '8px' }}>ID: {selectedItem.id}</span>
            </div>
            <div className="actions">
              <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(selectedItem)}>
                &#9998; Edit
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedItem)}>
                &#128465; Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowDetail(false); setSelectedItem(null); }}>
                &times; Close
              </button>
            </div>
          </div>
          <div className="detail-body">
            <div className="detail-grid">
              {(detailFields || formFields).map(f => (
                <div className="detail-field" key={f.name}>
                  <span className="field-label">{f.label}</span>
                  <span className="field-value">
                    {f.badge ? (
                      <span className={`badge badge-${String(selectedItem[f.name] || '').replace(/\s/g, '_')}`}>
                        {selectedItem[f.name] || '-'}
                      </span>
                    ) : (
                      selectedItem[f.name] != null ? String(selectedItem[f.name]) : '-'
                    )}
                  </span>
                </div>
              ))}
              <div className="detail-field">
                <span className="field-label">Created</span>
                <span className="field-value">{selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleString() : '-'}</span>
              </div>
              <div className="detail-field">
                <span className="field-label">Updated</span>
                <span className="field-value">{selectedItem.updated_at ? new Date(selectedItem.updated_at).toLocaleString() : '-'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bulk-actions">
          <span>{selectedIds.size} item(s) selected</span>
          <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
            Delete Selected
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedIds(new Set())}>
            Clear Selection
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="data-table-container">
        <div className="table-toolbar">
          <input
            className="form-control search-input"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-secondary btn-sm btn-export" onClick={handleExportCSV}>
            Export CSV
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            {sortedItems.length} records
          </span>
        </div>
        {loading ? (
          <div className="loading-overlay">
            <span className="loading-spinner"></span> Loading data...
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        className="row-checkbox"
                        checked={allOnPageSelected}
                        onChange={handleSelectAll}
                      />
                    </th>
                    {columns.map(col => (
                      <th
                        key={col.key}
                        className="sortable"
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label}
                        <span className="sort-arrow">
                          {sortKey === col.key ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : ' \u25BD'}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map(item => (
                    <tr key={item.id} onClick={() => handleRowClick(item)}
                      style={selectedItem?.id === item.id ? { background: 'var(--accent-glow)' } : {}}>
                      <td onClick={(e) => e.stopPropagation()} style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          className="row-checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={(e) => handleCheckboxChange(item.id, e)}
                        />
                      </td>
                      {columns.map(col => (
                        <td key={col.key}>{formatValue(item[col.key], col)}</td>
                      ))}
                    </tr>
                  ))}
                  {paginatedItems.length === 0 && (
                    <tr><td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '32px' }}>No records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {sortedItems.length > 0 && (
              <div className="pagination">
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {safePage} of {totalPages} ({sortedItems.length} records)
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* AI Analysis */}
      <AIPanel
        title={aiTitle}
        onAnalyze={handleAiAnalyze}
        result={aiResult}
        loading={aiLoading}
      />

      {/* Form Modal */}
      {showForm && (
        <Modal
          title={editItem ? `Edit ${title.replace(/s$/, '')}` : `New ${title.replace(/s$/, '')}`}
          onClose={() => setShowForm(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleFormSubmit}>
                {editItem ? 'Update' : 'Create'}
              </button>
            </>
          }
        >
          <form onSubmit={handleFormSubmit}>
            {formFields.map(f => (
              <div className="form-group" key={f.name}>
                <label>{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea
                    className="form-control"
                    value={formData[f.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                    placeholder={f.placeholder || ''}
                  />
                ) : f.type === 'select' ? (
                  <select
                    className="form-control"
                    value={formData[f.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                  >
                    <option value="">Select...</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    className="form-control"
                    type={f.type || 'text'}
                    value={formData[f.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                    placeholder={f.placeholder || ''}
                    step={f.type === 'number' ? 'any' : undefined}
                  />
                )}
              </div>
            ))}
          </form>
        </Modal>
      )}
    </div>
  );
}
