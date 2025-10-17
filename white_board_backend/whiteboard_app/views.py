from django.shortcuts import render
from .models import *
from .serializers import *
from rest_framework import viewsets, permissions

# Create your views here.
class WhiteBoardViewSet(viewsets.ModelViewSet):
    serializer_class = WhiteBoardSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return WhiteBoard.objects.filter(owner = self.request.user) 