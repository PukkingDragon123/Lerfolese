// Hosted builds that cannot serve .glb/.hdr files ship them as base64 inside <file>.b64.json.
// If the plain binary is missing, fetch transparently falls back to that packed copy.
const BIN = /\.(glb|hdr)(\?.*)?$/i;
const raw = window.fetch.bind(window);
const packs = {};
window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input?.url;
  if (!url || !BIN.test(url)) return raw(input, init);
  let res = null;
  try { res = await raw(input, init); if (res.ok && !/text\/html/i.test(res.headers.get('content-type') || '')) return res; } catch (e) { /* try the packed copy */ }
  try {
    const clean = url.replace(/(\?.*)?$/, '');
    let b64 = null; const p = await raw(clean + '.b64.json');
    if (p.ok && !/text\/html/i.test(p.headers.get('content-type') || '')) b64 = (await p.json()).b64;
    else { // last resort: a folder-wide pack (<dir>/pack.b64.json = { "<file>": b64 }), one file instead of many
      const dir = clean.slice(0, clean.lastIndexOf('/') + 1), name = clean.slice(dir.length);
      packs[dir] ??= raw(dir + 'pack.b64.json').then((r) => (r.ok && !/text\/html/i.test(r.headers.get('content-type') || '') ? r.json() : {})).catch(() => ({}));
      b64 = (await packs[dir])[name] || null;
      if (!b64) return res || p;
    }
    const s = atob(b64); const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return new Response(u.buffer, { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });
  } catch (e) { if (res) return res; throw e; }
};
