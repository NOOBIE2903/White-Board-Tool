import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from .models import WhiteBoard, WhiteBoardElement, WhiteBoardChat

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

        chats = await self.get_chat_history() 
        await self.send(json.dumps({
            "action": "chat_history",
            "payload": chats
        }))
        
        elements = await self.get_elements_history()
        await self.send(json.dumps({
            "action": "elements_history",
            "payload": elements
        }))
        
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        print(f"❌ Disconnected from whiteboard: {self.board_id}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action')

            if action not in ['add_element', 'draw', 'chat', 'delete_element']:
                print(f"⚠️ Unknown action received: {action}")
                return

            payload = data.get("payload")
            
            user = data.get("user", "Anonymous")

            print(payload.get("id"))
            
            if action == "add_element":
                await self.save_element(payload)

            if action == "chat":
                await self.save_chat(user, payload)
                
            if action == "delete_element":
                await self.delete_element(payload)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "whiteboard_action",
                    "action": action,
                    "payload": payload,
                    "user": user,
                }
            )

        except Exception as e:
            print("❌ Error in receive:", e)
            
    @sync_to_async
    def save_element (self, payload):
        # print(payload)
        WhiteBoardElement.objects.create(
            whiteboard=self.board,
            element_type=payload.get("type"),
            data=payload.get("data", {})
        )
       
    @sync_to_async
    def save_chat (self, user, payload):
        WhiteBoardChat.objects.create(
            whiteboard=self.board,
            user=user,
            message=payload.get("text", "")
        )
        
    @sync_to_async
    def get_chat_history(self):
        chats = WhiteBoardChat.objects.filter(whiteboard = self.board).order_by("timestamp")
        return [
            {"user": c.user, "text": c.message, "timestamp": str(c.timestamp)}
            for c in chats
        ]
        
    @sync_to_async
    def get_elements_history(self):
        elements = WhiteBoardElement.objects.filter(
            whiteboard = self.board
        )
        print(elements)
        return [
            {
                "element_id": str(el.element_id),
                "type": el.element_type,
                "data": el.data
            }
            for el in elements
        ]
        
    @sync_to_async
    def delete_element(self, payload):
        # print(payload)
        WhiteBoardElement.objects.filter(
            element_id=payload.get("id")
        ).delete()

    async def whiteboard_action(self, event):
        await self.send(
            text_data=json.dumps({
                'action': event['action'],
                'payload': event['payload'],
                'user': event.get('user'),
            })
        )
