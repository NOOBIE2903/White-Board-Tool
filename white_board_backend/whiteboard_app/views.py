from rest_framework import viewsets, permissions
from .models import WhiteBoard
from .serializers import WhiteBoardSerializer

class WhiteBoardViewSet(viewsets.ModelViewSet):
    serializer_class = WhiteBoardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WhiteBoard.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)