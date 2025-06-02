const WebSocket = require("ws");
const server = new WebSocket.Server({ port: 8080 });

const clients = new Map(); // Храним подключения: {id: ws}

function broadcast(message, excludeSender = null) {
  server.clients.forEach((client) => {
    try {
      if (client !== excludeSender && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    } catch (e) {
      console.error(e);
    }
  });
}

server.on("connection", (ws) => {
  // console.log("Новое подключение. Всего клиентов:", server.clients.size);

  // ws.removeAllListeners("message");

  // Обработчик входящих сообщений
  const handleMessage = (data) => {
    const msg = JSON.parse(data);
    switch (msg.type) {
      case "register":
        console.log("registered ", msg.sender);
        clients.set(msg.sender, ws);
        return;

      case "viewerRequest":
      case "offer":
      case "answer":
        if (msg.target && clients.has(msg.target)) {
          clients.get(msg.target).send(JSON.stringify(msg));
        }
        return;

      case "iceCandidate":
      default:
        // TODO: в типе "answer" нужно добавить roomId, чтобы сообщение отправлялось только одному пиру (тому, кто транслирует)
        if (msg.target && clients.has(msg.target)) {
          clients.get(msg.target).send(JSON.stringify(msg));
        } else {
          broadcast(msg, ws);
        }
        return;
    }
  };

  // Добавляем обработчик
  ws.on("message", handleMessage);

  ws.on("close", () => {
    console.log('Клиент отключился. Всего:', server.clients.size);
    clients.forEach((client, id) => {
      if (client === ws) {
        clients.delete(id);
      }
    });
    ws.removeListener("message", handleMessage); // Удаляем конкретный обработчик
  });
});
