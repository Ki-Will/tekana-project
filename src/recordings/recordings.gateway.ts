import { WebSocketGateway, SubscribeMessage, WebSocketServer } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class RecordingsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join')
  handleJoin(client: Socket, userId: string) {
    client.join(userId);
  }

  emitRecordingAdded(userId: string, recording: any) {
    this.server.to(userId).emit('recordingAdded', recording);
  }
}
