from.models import *
from rest_framework import serializers

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user
        

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
        read_only_fields = ['owner']