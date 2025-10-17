from django.db import models
from django.contrib.auth.models import User
import uuid
from django.utils.translation import gettext_lazy as _


class WhiteBoard(models.Model):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
    
class WhiteBoardElement(models.Model):
    ELEMENT_TYPES = [
        ('rectangle', 'Rectangle'),
        ('text', 'Text'),
        ('line', 'Line'),
    ]
    
    whiteboard = models.ForeignKey(WhiteBoard, on_delete=models.CASCADE, related_name='elements')
    element_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    element_type = models.CharField(max_length=50, choices=ELEMENT_TYPES)
    data = models.JSONField(_("Properties"), default=dict, blank=True)

    def __str__(self):
        return f"{self.get_element_type_display()} on whiteboard {self.whiteboard.id}"