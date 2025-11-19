import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from .models import WhiteBoard

class WhiteboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.board_id = self.scope['url_route']['kwargs']['board_id']
        self.room_group_name = f'whiteboard_{self.board_id}'

        try:
            self.board = await sync_to_async(WhiteBoard.objects.get)(id=self.board_id)
        except WhiteBoard.DoesNotExist:
            print(f"❌ Invalid board ID: {self.board_id}")
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.accept()
        print(f"✅ Connected to whiteboard: {self.board_id}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        print(f"❌ Disconnected from whiteboard: {self.board_id}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action')

            if action not in ['add_element', 'draw', 'chat']:
                print(f"⚠️ Unknown action received: {action}")
                return

            payload = (
                data.get('payload')
                or data.get('element')
                or data.get('draw')
                or data.get('message')
            )

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'whiteboard_action',
                    'action': action,
                    'payload': payload,
                    'user': data.get('user', 'Anonymous'),
                }
            )

        except Exception as e:
            print("❌ Error in receive:", e)

    async def whiteboard_action(self, event):
        await self.send(
            text_data=json.dumps({
                'action': event['action'],
                'payload': event['payload'],
                'user': event.get('user'),
            })
        )
