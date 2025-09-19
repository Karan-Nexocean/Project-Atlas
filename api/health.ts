function sendJson(res: any, status: number, payload: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function sendText(res: any, status: number, text: string) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain');
  res.end(text);
}

const handler = async (req: any, res: any) => {
  if (req.method !== 'POST') {
    sendText(res, 405, 'Method Not Allowed');
    return;
  }
  try {
    sendJson(res, 200, { ok: true, t: Date.now() });
  } catch (e: any) {
    sendJson(res, 500, { ok: false, error: e?.message || 'error' });
  }
};

export default handler;
