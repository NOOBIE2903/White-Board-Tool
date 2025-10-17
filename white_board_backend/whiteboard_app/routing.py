from django.urls import path
from .consumers import WhiteboardConsumer

websocket_urlpatterns = [
    path('ws/whiteboard/<int:board_id>/', WhiteboardConsumer.as_asgi()),
]