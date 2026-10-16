/* api/contact.mjs — STUB from the skeleton. The api worker replaces this file (contract: api/README.md).
   Until then every request gets 503 {"error":"not configured"}, which makes the forms fall back to mailto. */
export default {
  async fetch(request) {
    void request;
    return new Response(JSON.stringify({ error: 'not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
};
