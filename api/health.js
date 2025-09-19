function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain');
  res.end(text);
}

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    sendText(res, 405, 'Method Not Allowed');
    return;
  }
  try {
    sendJson(res, 200, { ok: true, t: Date.now() });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: e?.message || 'error' });
  }
};

export default handler;