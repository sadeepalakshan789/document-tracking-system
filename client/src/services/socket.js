import { io } from "socket.io-client";

let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
    console.log("Socket.io client connected");
  }
  return socket;
};

export const getSocket = () => {
  return socket || connectSocket();
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("Socket.io client disconnected");
  }
};
