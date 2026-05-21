const clients = new Set();

function sendFrame(res, eventName, payload) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function addClient(res) {
  clients.add(res);
  sendFrame(res, 'connected', { at: new Date().toISOString() });
  return () => clients.delete(res);
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
  for (const res of Array.from(clients)) {
    try {
      sendFrame(res, 'admin-event', payload);
    } catch {
      clients.delete(res);
    }
  }
}

function heartbeat() {
  for (const res of Array.from(clients)) {
    try {
      sendFrame(res, 'heartbeat', { at: new Date().toISOString() });
    } catch {
      clients.delete(res);
    }
  }
}

const heartbeatTimer = setInterval(heartbeat, 25_000);
if (typeof heartbeatTimer.unref === 'function') heartbeatTimer.unref();

module.exports = {
  addClient,
  publishAdminEvent,
};
