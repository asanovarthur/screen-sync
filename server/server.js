const WebSocket = require("ws");
const PORT = 8080;
const server = new WebSocket.Server({ port: PORT });

console.log(`Started Websocket server on port ${PORT}`);

const clients = new Map();

const broadcast = (message, excludeSender = null) => {
  server.clients.forEach((client) => {
    try {
      if (client !== excludeSender && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    } catch (e) {
      console.error(e);
    }
  });
};

const target = (message) => {
  if (message.target && clients.has(message.target)) {
    clients.get(message.target).send(JSON.stringify(message));
  }
};

server.on("connection", (ws) => {
  const handleMessage = (data) => {
    const message = JSON.parse(data);
    switch (message.type) {
      case "register":
        console.log(`Registered room#${message.sender}`);
        clients.set(message.sender, ws);
        return;

      case "viewerRequest":
      case "offer":
      case "answer":
        target(message);
        return;

      case "iceCandidate":
      default:
        if (message.target) {
          target(message);
        } else {
          broadcast(message, ws);
        }
        return;
    }
  };

  ws.on("message", handleMessage);

  ws.on("close", () => {
    console.log(`Peer disconnected. Total peers left: ${server.clients.size}`);
    clients.forEach((client, id) => {
      if (client === ws) {
        clients.delete(id);
      }
    });
    ws.removeListener("message", handleMessage);
  });
});
