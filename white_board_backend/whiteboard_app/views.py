from rest_framework import viewsets, permissions
from .models import WhiteBoard
from .serializers import WhiteBoardSerializer, UserSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from .services.ai_service import generate_ui_from_wireframe

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

@api_view(['GET'])
def health_check(request):
    return Response({"status": "ok", "message": "Backend is healthy"})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generate_code_from_wireframe(request, board_id):
    try:
        try:
            board = WhiteBoard.objects.get(id=board_id)
        except WhiteBoard.DoesNotExist:
            return Response({"error": "Whiteboard not found"}, status=status.HTTP_404_NOT_FOUND)

        elements = request.data.get('elements', [])
        image_data_url = request.data.get('image', None)
        framework = request.data.get('framework', 'react-tailwind')
        custom_prompt = request.data.get('custom_prompt', '')

        # If frontend didn't pass elements in payload, fallback to DB elements
        if not elements:
            db_elements = board.elements.all()
            elements = [
                {
                    "element_id": str(el.element_id),
                    "element_type": el.element_type,
                    "data": el.data,
                }
                for el in db_elements
            ]

        if not elements and not image_data_url:
            return Response(
                {"error": "No elements or canvas image provided to generate code."},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = generate_ui_from_wireframe(
            elements=elements,
            image_data_url=image_data_url,
            framework=framework,
            custom_prompt=custom_prompt,
        )
        return Response(result, status=status.HTTP_200_OK)

    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
