import React, { useEffect, useState } from 'react';
import './styles.css';

interface RequestData {
  headers: chrome.webRequest.HttpHeader[];
  url: string;
  timestamp: number;
}

const Popup: React.FC = () => {
  const [headers, setHeaders] = useState<{ [key: string]: RequestData }>({});
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 设置过滤参数
  const [filter, setFilter] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchHeaders = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'getHeaders' });
        setHeaders(response);
      } catch (err) {
        setError('Failed to fetch headers');
        console.error('Error fetching headers:', err);
      }
    };

    fetchHeaders();
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isAuthHeader = (name: string) => {
    const authHeaders = ['authorization', 'cookie', 'set-cookie'];
    return authHeaders.includes(name.toLowerCase());
  };

  const CopyIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" />
    </svg>
  );

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17L4 12" />
    </svg>
  );

  return (
    <div className="container">
      <h1>HTTP Headers Viewer</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="filter-container">
        <div>
          <input type="text" placeholder={filter["url"]} onChange={(e) => setFilter({ "url": e.target.value })} />
        </div>
        <div>
          <input type="text" placeholder="filter by header" onChange={(e) => setFilter({ "header": e.target.value })} />
        </div>
      </div>
      {Object.keys(headers).length === 0 ? (
        <div className="no-headers">No headers captured yet</div>
      ) : (
        <div className="headers-list">
          {Object.entries(headers).map(([key, data]) => (
            <div key={key} className="request-item">
              <div className="request-info">
                <div>URL: {data.url}</div>
                <div className="timestamp">Time: {formatTimestamp(data.timestamp)}</div>
              </div>
              <table className={filter.url && !data.url.includes(filter.url) ? 'hidden' : ''}>
                <thead>
                  <tr>
                    <th>Header Name</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.headers.map((header, index) => {
                    const headerKey = `${key}_${header.name}`;
                    const isAuth = isAuthHeader(header.name);
                    return (
                      <tr key={index} className={isAuth ? 'auth-header' : ''}>
                        <td>{header.name}</td>
                        <td>
                          <div className="header-row">
                            <span className="header-value">{header.value || ''}</span>
                            <button
                              className={`copy-button ${copiedKey === headerKey ? 'copy-success' : ''}`}
                              onClick={() => header.value && copyToClipboard(header.value, headerKey)}
                              title="Copy to clipboard"
                            >
                              {copiedKey === headerKey ? <CheckIcon /> : <CopyIcon />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Popup; 