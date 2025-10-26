// Simple Proxy Service
// Proxy for https://funnerwsmsinarainyglobal.pages.dev/

const TARGET_SITE = "https://funnerwsmsinarainyglobal.pages.dev";

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // 构建目标URL
  const targetUrl = new URL(TARGET_SITE);
  targetUrl.pathname = url.pathname;
  targetUrl.search = url.search;

  console.log(`Proxy request: ${request.method} ${url.pathname}`);

  try {
    // 创建代理请求头
    const headers = new Headers();
    
    // 复制重要的请求头
    for (const [key, value] of request.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (!['host', 'origin', 'referer'].includes(lowerKey)) {
        headers.set(key, value);
      }
    }
    
    // 设置正确的Host
    headers.set('Host', new URL(TARGET_SITE).host);
    
    // 发起代理请求
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? null : request.body,
    });

    // 创建响应头
    const responseHeaders = new Headers();
    
    // 复制响应头并设置CORS
    for (const [key, value] of response.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'set-cookie') {
        // 处理Cookie
        const modifiedCookie = value
          .replace(/Domain=[^;]+;?\s*/gi, '')
          .replace(/Secure;?\s*/gi, '')
          .replace(/SameSite=[^;]+;?\s*/gi, 'SameSite=Lax');
        responseHeaders.set(key, modifiedCookie);
      } else if (!['content-security-policy', 'x-frame-options'].includes(lowerKey)) {
        responseHeaders.set(key, value);
      }
    }
    
    // 设置CORS
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
    
  } catch (error) {
    console.error('Proxy request failed:', error);
    
    return new Response(`Proxy request failed: ${error.message}`, {
      status: 502,
      headers: { 
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Deno Deploy 入口点
export default {
  fetch: handleRequest,
};