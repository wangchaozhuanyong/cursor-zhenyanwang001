const clients = new Map();
let nextClientSeq = 0;

function sendFrame(res, eventName, payload) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function addClient(res) {
  const clientId = `admin-sse-${Date.now()}-${++nextClientSeq}`;
  const now = new Date().toISOString();
  const client = {
    clientId,
    res,
    connectedAt: now,
    lastHeartbeatAt: now,
  };
  clients.set(clientId, client);
  sendFrame(res, 'connected', { clientId, connectedAt: now, at: now });
  return () => clients.delete(clientId);
}

function publishAdminEvent(event) {
  const payload = {
    type: String(event?.type || 'admin.event'),
    objectId: event?.objectId ? String(event.objectId) : '',
    summary: event?.summary ? String(event.summary) : '',
    eventType: event?.eventType ? String(event.eventType) : '',
    severity: event?.severity ? String(event.severity) : '',
    status: event?.status ? String(event.status) : '',
    category: event?.category ? String(event.category) : '',
    at: new Date().toISOString(),
  };
  let sent = 0;
  for (const client of Array.from(clients.values())) {
    try {
      sendFrame(client.res, 'admin-event', payload);
      sent += 1;
    } catch {
      clients.delete(client.clientId);
    }
  }
  return sent;
}

function heartbeat() {
  for (const client of Array.from(clients.values())) {
    try {
      const at = new Date().toISOString();
      sendFrame(client.res, 'heartbeat', { clientId: client.clientId, at });
      client.lastHeartbeatAt = at;
    } catch {
      clients.delete(client.clientId);
    }
  }
}

const heartbeatTimer = setInterval(heartbeat, 25_000);
if (typeof heartbeatTimer.unref === 'function') heartbeatTimer.unref();

module.exports = {
  addClient,
  publishAdminEvent,
};
