import os

# ✅ STEP 1: Configure settings FIRST
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "white_board_backend.settings")

# ✅ STEP 2: Initialize Django
from django.core.asgi import get_asgi_application
django_asgi_app = get_asgi_application()

# ✅ STEP 3: Safe imports AFTER Django is ready
from channels.routing import ProtocolTypeRouter, URLRouter
from whiteboard_app.middleware import JWTAuthMiddleware
import whiteboard_app.routing

# ✅ STEP 4: Define application
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(
            whiteboard_app.routing.websocket_urlpatterns
        )
    ),
})
