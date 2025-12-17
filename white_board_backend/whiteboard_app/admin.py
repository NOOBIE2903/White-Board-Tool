from django.contrib import admin
from .models import *

# Register your models here.
admin.site.register(WhiteBoard)
admin.site.register(WhiteBoardElement)
admin.site.register(WhiteBoardChat)
admin.site.register(WhiteBoardAction)
admin.site.register(WhiteBoardRedoAction)