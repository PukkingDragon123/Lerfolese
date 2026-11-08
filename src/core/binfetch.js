// Hosted builds that cannot serve .glb/.hdr files ship them as base64 inside <file>.b64.json.
// If the plain binary is missing, fetch transparently falls back to that packed copy.
const BIN = /\.(glb|hdr)(\?.*)?$/i;
const raw = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input?.url;
  if (!url || !BIN.test(url)) return raw(input, init);
  let res = null;
  try { res = await raw(input, init); if (res.ok && !/text\/html/i.test(res.headers.get('content-type') || '')) return res; } catch (e) { /* try the packed copy */ }
  try {
    const p = await raw(url.replace(/(\?.*)?$/, '') + '.b64.json');
    if (!p.ok) return res || p;
    const { b64 } = await p.json(); const s = atob(b64); const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return new Response(u.buffer, { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });
  } catch (e) { if (res) return res; throw e; }
};
