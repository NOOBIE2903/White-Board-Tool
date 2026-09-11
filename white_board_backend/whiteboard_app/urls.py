from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'users', UserViewSet, basename="user") 
router.register(r'whiteboards', WhiteBoardViewSet, basename='whiteboard')

urlpatterns = [
    # path('create_whiteboard/', create_whiteboard),
    path('health/', health_check, name='health_check'),
    path('whiteboards/<uuid:board_id>/generate-code/', generate_code_from_wireframe, name='generate_wireframe_code'),
    path('', include(router.urls)),
]