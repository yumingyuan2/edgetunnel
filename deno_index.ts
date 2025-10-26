// deno-lint-ignore-file
// @ts-ignore
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// 目标网站URL
const TARGET_SITE = "https://funnerwsmsinarainyglobal.pages.dev/";

async function handler(req: Request): Promise<Response> {
  const incomingUrl = new URL(req.url);
  
  // 构建目标URL
  const targetUrl = new URL(TARGET_SITE);
  targetUrl.pathname = incomingUrl.pathname;
  targetUrl.search = incomingUrl.search;

  console.log(`Proxy request: ${req.method} ${incomingUrl.pathname} -> ${targetUrl.toString()}`);

  try {
    // 创建新的请求头，移除可能导致问题的头部
    const proxyHeaders = new Headers();
    
    // 复制必要的请求头
    for (const [key, value] of req.headers.entries()) {
      // 跳过一些可能导致问题的头部
      const lowerKey = key.toLowerCase();
      if (![
        'host',
        'origin', 
        'referer',
        'x-forwarded-for',
        'x-forwarded-proto',
        'x-forwarded-host',
        'x-real-ip',
        'connection',
        'upgrade',
        'proxy-connection'
      ].includes(lowerKey)) {
        proxyHeaders.set(key, value);
      }
    }
    
    // 设置正确的Host头
    proxyHeaders.set('Host', new URL(TARGET_SITE).host);

    // 发起代理请求
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: proxyHeaders,
      body: req.method === 'GET' || req.method === 'HEAD' ? null : req.body,
      redirect: 'manual'
    });

    // 创建响应头
    const responseHeaders = new Headers();
    
    // 复制响应头，但修改一些关键头部以支持代理
    for (const [key, value] of response.headers.entries()) {
      const lowerKey = key.toLowerCase();
      
      if (lowerKey === 'location') {
        // 重写重定向URL
        try {
          const locationUrl = new URL(value, TARGET_SITE);
          const proxyUrl = new URL(req.url);
          proxyUrl.pathname = locationUrl.pathname;
          proxyUrl.search = locationUrl.search;
          responseHeaders.set(key, proxyUrl.toString());
        } catch {
          // 如果解析失败，直接使用原始值
          responseHeaders.set(key, value);
        }
      } else if (lowerKey === 'set-cookie') {
        // 处理Cookie，移除域名限制以支持代理
        const modifiedCookie = value
          .replace(/Domain=[^;]+;?\s*/gi, '')
          .replace(/Secure;?\s*/gi, '')
          .replace(/SameSite=[^;]+;?\s*/gi, 'SameSite=Lax');
        responseHeaders.set(key, modifiedCookie);
      } else if (![
        'content-security-policy',
        'x-frame-options',
        'strict-transport-security'
      ].includes(lowerKey)) {
        responseHeaders.set(key, value);
      }
    }
    
    // 设置CORS头部，允许跨域访问
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    
    // 直接返回响应，不修改内容
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
    
  } catch (error) {
    console.error('Proxy request failed:', error);
    
    // 返回简单的错误响应，不包含自定义错误页面
    return new Response(`Proxy request failed: ${error.message}`, {
      status: 502,
      headers: { 
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// 启动服务器
// @ts-ignore
const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`🚀 Proxy Service Started`);
console.log(`📍 Listening on port: ${port}`);
console.log(`🎯 Target site: ${TARGET_SITE}`);

// @ts-ignore
serve(handler, { port });