from django.urls import path, re_path
from .consumers import WhiteboardConsumer
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/whiteboard/(?P<board_id>[^/]+)/$', consumers.WhiteboardConsumer.as_asgi()),
    re_path(r'ws/chat/(?P<room_name>\w+)/$', consumers.WhiteboardConsumer.as_asgi()),
]