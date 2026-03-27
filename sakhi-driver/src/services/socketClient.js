// Socket.IO client — to be configured in Prompt 6
let socket = null;

export function getSocket() {
  return socket;
}

export function setSocket(s) {
  socket = s;
}
