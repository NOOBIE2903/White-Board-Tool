from .models import *
from rest_framework import serializers


class WhiteBoardSerializer (serializers.ModelSerializer):
    class Meta:
        model = WhiteBoard
        fields = ['id', 'name', 'owner', 'created_at']
        
class WhiteBoardElementSerializer (serializers.ModelSerializer):
    class Meta:
        model = WhiteBoardElement
        fields = '__all__'
        
