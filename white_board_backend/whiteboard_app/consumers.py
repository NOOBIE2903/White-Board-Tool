import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from .models import WhiteBoard, WhiteBoardElement, WhiteBoardChat, WhiteBoardAction, WhiteBoardRedoAction
from django.db import transaction


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

            if action not in ['add_element', 'undo', 'redo', 'draw_end', 'draw', 'chat', 'delete_element']:
                print(f"⚠️ Unknown action received: {action}")
                return

            payload = data.get("payload") or {}
            
            user = data.get("user", "Anonymous")

            # print(payload.get("id"))
            
            if action == "add_element":
                await self.save_element(payload)

            elif action == "chat":
                await self.save_chat(user, payload)
                
            elif action == "delete_element":
                await self.delete_element(payload)
                
            elif action == "undo":
                result = await self.undo_last_action()
                
                if result:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            "type": "whiteboard_action",
                            "action": "undo",
                            "payload": result,
                            "user": user,
                        }
                    )
                return
            
            elif action == "redo":
                result = await self.redo_last_action()
                
                if result:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            "type": "whiteboard_action",
                            "action": "redo",
                            "payload": result,
                            "user": user,
                        }
                    )
                return
            
            elif action == "draw":
                await self.update_element(payload)
            
            elif action == "draw_end":
                await self.save_draw_action(payload)

            else:
                return 
            
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
        element = WhiteBoardElement.objects.create(
            whiteboard=self.board,
            element_id = payload.get("element_id"),
            element_type=payload.get("type"),
            data=payload.get("data", {})
        )
        
        WhiteBoardAction.objects.create(
            whiteboard = self.board,
            action_type = "add",
            element_snapshot = {
                "element_id": str(element.element_id),
                "type": element.element_type,
                "data": element.data,
            }
        )
        
        WhiteBoardRedoAction.objects.filter(
            whiteboard=self.board
        ).delete()
       
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
        if not payload:
            return
        
        element = WhiteBoardElement.objects.filter(
            element_id=payload.get("element_id")
        ).first()
        
        if not element:
            return 
        
        WhiteBoardAction.objects.create(
            whiteboard = self.board,
            action_type = "delete",
            element_snapshot={
                "element_id": str(element.element_id),
                "type": element.element_type,
                "data": element.data,
            }
        )
        
        WhiteBoardRedoAction.objects.filter(
            whiteboard=self.board
        ).delete()
        
        element.delete()
        
    @sync_to_async
    @transaction.atomic
    def undo_last_action (self):
        last = WhiteBoardAction.objects.filter(
            whiteboard = self.board
        ).order_by("-created_at").first()
        
        if not last:
            return None
        
        WhiteBoardRedoAction.objects.create(
            whiteboard=self.board,
            action_type=last.action_type,
            element_snapshot=last.element_snapshot
        )
        
        if last.action_type == "add":
            WhiteBoardElement.objects.filter(
                element_id = last.element_snapshot["element_id"]
            ).delete()
            
            last.delete()
            
            return {
                "type": "delete",
                "element_id": last.element_snapshot["element_id"]
            }
            
        if last.action_type == "draw":
            WhiteBoardElement.objects.filter(
                element_id=last.element_snapshot["element_id"]
            ).delete()

            last.delete()

            return {
                "type": "delete",
                "element_id": last.element_snapshot["element_id"]
            }
            
        if last.action_type == "delete":
            WhiteBoardElement.objects.create(
                whiteboard = self.board,
                element_id = last.element_snapshot["element_id"],
                element_type = last.element_snapshot["type"],
                data = last.element_snapshot["data"]
            )
            
            last.delete()
            
            return {
                "type": "add",
                "element": last.element_snapshot
            }
            
    @sync_to_async
    @transaction.atomic
    def redo_last_action(self):
        last = WhiteBoardRedoAction.objects.filter(
            whiteboard=self.board
        ).order_by("-created_at").first()

        if not last:
            return None

        # 🔁 REDO ADD OR DRAW → recreate element
        if last.action_type in ("add", "draw"):
            WhiteBoardElement.objects.update_or_create(
                whiteboard=self.board,
                element_id=last.element_snapshot["element_id"],
                defaults={
                    "element_type": last.element_snapshot["type"],
                    "data": last.element_snapshot["data"],
                }
            )

            WhiteBoardAction.objects.create(
                whiteboard=self.board,
                action_type=last.action_type,
                element_snapshot=last.element_snapshot
            )

            last.delete()

            return {
                "type": "add",
                "element": last.element_snapshot
            }

        # 🔁 REDO DELETE → delete element
        if last.action_type == "delete":
            WhiteBoardElement.objects.filter(
                element_id=last.element_snapshot["element_id"]
            ).delete()

            WhiteBoardAction.objects.create(
                whiteboard=self.board,
                action_type="delete",
                element_snapshot=last.element_snapshot
            )

            last.delete()

            return {
                "type": "delete",
                "element_id": last.element_snapshot["element_id"]
            }
            
    @sync_to_async
    def update_element(self, payload):
        if not payload:
            return

        element = WhiteBoardElement.objects.filter(
            element_id=payload.get("element_id")
        ).first()

        if not element:
            return

        data = element.data.copy()
        data["points"] = data.get("points", []) + payload.get("point", [])
        element.data = data
        element.save(update_fields=["data"])
        # element.save()
        
    @sync_to_async
    def save_draw_action(self, payload):
        element = WhiteBoardElement.objects.filter(
            element_id=payload.get("element_id")
        ).first()

        if not element:
            return

        WhiteBoardAction.objects.create(
            whiteboard=self.board,
            action_type="draw",
            element_snapshot={
                "element_id": str(element.element_id),
                "type": element.element_type,
                "data": element.data,
            }
        )

        WhiteBoardRedoAction.objects.filter(
            whiteboard=self.board
        ).delete()


    async def whiteboard_action(self, event):
        await self.send(
            text_data=json.dumps({
                'action': event['action'],
                'payload': event['payload'],
                'user': event.get('user'),
            })
        )
