import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { db } from '../database/init';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  username?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var io: Server | undefined;
}

export function setupSocketHandlers(io: Server) {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
      if (err) {
        return next(new Error('Authentication error'));
      }

      // Get user info from database
      db.get(
        'SELECT id, username FROM users WHERE id = ?',
        [decoded.userId],
        (err, user: any) => {
          if (err || !user) {
            return next(new Error('Authentication error'));
          }

          socket.userId = user.id;
          socket.username = user.username;
          next();
        }
      );
    });
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.username} connected`);

    // Join user's personal room for notifications
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.username} disconnected`);
    });

    // Handle typing indicators (for future chat features)
    socket.on('typing', (data) => {
      socket.broadcast.to(data.room).emit('user-typing', {
        username: socket.username,
        room: data.room
      });
    });

    // Handle stop typing
    socket.on('stop-typing', (data) => {
      socket.broadcast.to(data.room).emit('user-stop-typing', {
        username: socket.username,
        room: data.room
      });
    });
  });

  return io;
}

// Function to send notification to specific user
export function sendNotificationToUser(userId: number, notification: any) {
  const io = global.io as Server;
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
}

// Function to send notification to multiple users
export function sendNotificationToUsers(userIds: number[], notification: any) {
  const io = global.io as Server;
  if (io) {
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit('notification', notification);
    });
  }
}

// Function to broadcast to all connected users
export function broadcastToAll(event: string, data: any) {
  const io = global.io as Server;
  if (io) {
    io.emit(event, data);
  }
}

// Function to send to specific room
export function sendToRoom(room: string, event: string, data: any) {
  const io = global.io as Server;
  if (io) {
    io.to(room).emit(event, data);
  }
} 