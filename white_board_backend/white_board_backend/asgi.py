"""
ASGI config for white_board_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'white_board_backend.settings')

django_asgi_app = get_asgi_application()

import whiteboard_app.routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            whiteboard_app.routing.websocket_urlpatterns
        )
    ),
})
# ProtocolTypeRouter: It's a router that looks at the protocol (like http or websocket) to decide what to do.
# URLRouter: This is a router that looks at the URL path to decide which consumer (WebSocket code) to run, similar to how Django's urls.py works.
# AuthMiddlewareStack: This adds authentication support to WebSocket connections, allowing you to access user information in your consumers.
# whiteboard_app.routing: We import the file that will contain the list of WebSocket URL patterns.
