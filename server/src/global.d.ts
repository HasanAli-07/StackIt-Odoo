import { Server } from 'socket.io';

declare global {
  namespace NodeJS {
    interface Global {
      io?: Server;
    }
  }
  var io: Server | undefined;
}

export {}; 