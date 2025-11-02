import json
from channels.generic.websocket import AsyncWebsocketConsumer

class WhiteboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.board_id = self.scope['url_route']['kwargs']['board_id']
        self.room_group_name = f'whiteboard_{self.board_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        print("Connected to whiteboard:", self.board_id)
        
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print("Disconnected from whiteboard:", self.board_id)
        
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action')

            if action in ['add_element', 'draw', 'chat']:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'whiteboard_action',
                        'action': action,
                        'payload': data.get('payload') or data.get('element') or data.get('draw') or data.get('message'),
                        'user': data.get('user', 'Anonymous'),
                    }
                )
        except Exception as e:
            print("Receive error:", e)
        
    async def whiteboard_action(self, event):
        print("Broadcasting:", event)
        await self.send(text_data=json.dumps({
            'action': event['action'],
            'payload': event['payload'],
            'user': event.get('user'),
        }))