from.models import *
from rest_framework import serializers

class WhiteBoardElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhiteBoardElement
        fields = ['id', 'element_id', 'element_type', 'data']

class WhiteBoardSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')
    elements = WhiteBoardElementSerializer(many=True, read_only=True)
    
    class Meta:
        model = WhiteBoard
        fields = ['id', 'name', 'owner', 'created_at', 'elements']