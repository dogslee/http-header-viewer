interface RequestData {
  headers: chrome.webRequest.HttpHeader[];
  url: string;
  timestamp: number;
}

let requestHeaders: { [key: string]: RequestData } = {};
let currentTabDomain: string | null = null;

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const url = new URL(tab.url);
      currentTabDomain = url.hostname;
      console.log('Current domain updated:', currentTabDomain);
      // 清理旧数据
      requestHeaders = {};
    } catch (error) {
      console.error('Error parsing URL:', error);
    }
  }
});

// 监听标签页切换
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      const url = new URL(tab.url);
      currentTabDomain = url.hostname;
      console.log('Current domain updated:', currentTabDomain);
      // 清理旧数据
      requestHeaders = {};
    }
  } catch (error) {
    console.error('Error getting tab info:', error);
  }
});

// 创建请求过滤器
const createRequestFilter = () => {
  if (!currentTabDomain) return { urls: [] };
  
  return {
    urls: [
      `*://${currentTabDomain}/*`,
      `*://*.${currentTabDomain}/*`
    ]
  };
};

// 监听请求头
chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    if (!currentTabDomain) return;

    try {
      const requestUrl = new URL(details.url);
      // 只处理当前域名下的请求
      if (requestUrl.hostname === currentTabDomain || requestUrl.hostname.endsWith(`.${currentTabDomain}`)) {
        console.log('Request headers captured:', details.url);
        if (details.requestHeaders) {
          const key = `${Date.now()}_${details.requestId}`;
          requestHeaders[key] = {
            headers: details.requestHeaders,
            url: details.url,
            timestamp: Date.now()
          };
          console.log('Headers for', details.url, ':', details.requestHeaders);
        }
      }
    } catch (error) {
      console.error('Error processing request:', error);
    }
  },
  { urls: ["<all_urls>"] }, // 监听所有请求，在回调中过滤
  ["requestHeaders", "extraHeaders"] // 添加 extraHeaders 权限
);

// 监听请求开始
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    console.log('Request started:', details.url);
  },
  { urls: ["<all_urls>"] }
);

// 监听请求完成
chrome.webRequest.onCompleted.addListener(
  (details) => {
    console.log('Request completed:', details.url);
  },
  { urls: ["<all_urls>"] }
);

// 监听请求错误
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    console.log('Request error:', details.url, details.error);
  },
  { urls: ["<all_urls>"] }
);

// 定期清理旧的请求数据
setInterval(() => {
  const now = Date.now();
  Object.keys(requestHeaders).forEach(key => {
    if (now - requestHeaders[key].timestamp > 300000) { // 5分钟后清理
      delete requestHeaders[key];
    }
  });
}, 60000); // 每分钟清理一次

// 处理来自 popup 的消息
chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    console.log('Message received:', request);
    if (request.type === 'getHeaders') {
      // 按时间戳排序，最新的请求在前
      const sortedHeaders = Object.entries(requestHeaders)
        .sort(([, dataA], [, dataB]) => dataB.timestamp - dataA.timestamp)
        .reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {} as typeof requestHeaders);

      console.log('Sending headers:', sortedHeaders);
      sendResponse(sortedHeaders);
    }
    return true; // 保持消息通道开放
  }
); 