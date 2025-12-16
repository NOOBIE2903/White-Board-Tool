from rest_framework import viewsets, permissions
from .models import WhiteBoard
from .serializers import WhiteBoardSerializer, UserSerializer
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth.models import User

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    
    print("-----------------------------------")

    def get_permissions(self):
        if self.action == 'create':   
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    

class WhiteBoardViewSet(viewsets.ModelViewSet):
    serializer_class = WhiteBoardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WhiteBoard.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

        
# @api_view(['POST'])
# def create_whiteboard(request):
#     user = request.user if request.user.is_authenticated else None
#     if not user:
#         return Response({"error": "Authentication required"}, status=401)

#     name = request.data.get('name', 'Untitled Board')
#     board = WhiteBoard.objects.create(name=name, owner=user)
#     return Response({'id': str(board.id), 'name': board.name})