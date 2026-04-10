import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;

function extractTokenFromCookie(cookieHeader) {
    if (!cookieHeader) return null;
    const parts = cookieHeader.split(";").map((part) => part.trim());
    const tokenPair = parts.find((part) => part.startsWith("token="));
    if (!tokenPair) return null;
    return decodeURIComponent(tokenPair.split("=")[1]);
}

export function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN,
            credentials: true,
        },
    });

    io.use((socket, next) => {
        try {
            const token = extractTokenFromCookie(socket.handshake.headers.cookie);
            if (!token) return next();
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = payload.id || payload.sub;
            return next();
        } catch (error) {
            return next();
        }
    });

    io.on("connection", (socket) => {
        if (socket.userId) {
            socket.join(`user:${socket.userId}`);
        }

        socket.on("register", (userId) => {
            if (userId) {
                socket.join(`user:${userId}`);
            }
        });
    });

    return io;
}

export function getIo() {
    return io;
}

export function emitToUser(userId, event, payload) {
    if (!io || !userId) return;
    io.to(`user:${userId}`).emit(event, payload);
}
