# this file is like the views file for WebSockets
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class WhiteboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print("WebSocket connected!")
        await self.accept()

    async def disconnect(self, close_code):
        print(f"WebSocket disconnected with code: {close_code}")
        pass

    async def receive(self, text_data):
        print(f"Received message: {text_data}")

        await self.send(text_data=json.dumps({
            'type': 'confirmation',
            'message': 'We received your message!'
        }))