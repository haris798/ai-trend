// api-src/health.ts
function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
function handler(_req, res) {
  const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  sendJson(res, 200, {
    success: true,
    service: "ai-trend",
    supabaseConfigured: hasSupabase,
    geminiConfigured: hasGemini,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
export {
  handler as default
};
