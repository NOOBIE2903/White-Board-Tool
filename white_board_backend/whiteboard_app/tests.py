from django.test import TestCase
import os
from .services.ai_service import _sanitize_elements, generate_ui_from_wireframe


class AIServiceTestCase(TestCase):
    def test_element_sanitizer_spatial_sorting(self):
        sample_elements = [
            {"type": "rectangle", "data": {"x": 50, "y": 20, "width": 800, "height": 60}},
            {"type": "rectangle", "data": {"x": 50, "y": 100, "width": 200, "height": 500}},
            {"type": "line", "data": {"points": [10, 250, 50, 260]}},
        ]
        sanitized = _sanitize_elements(sample_elements)
        self.assertEqual(len(sanitized), 3)
        self.assertEqual(sanitized[0]["type"], "rectangle")
        self.assertEqual(sanitized[0]["y"], 20)
        self.assertEqual(sanitized[1]["y"], 100)
        self.assertEqual(sanitized[2]["y"], 250)

    def test_missing_api_key_validation(self):
        orig_key = os.environ.get("GEMINI_API_KEY")
        if "GEMINI_API_KEY" in os.environ:
            del os.environ["GEMINI_API_KEY"]
        try:
            with self.assertRaises(ValueError):
                generate_ui_from_wireframe([{"type": "rectangle", "data": {"x": 0, "y": 0, "width": 100, "height": 100}}])
        finally:
            if orig_key:
                os.environ["GEMINI_API_KEY"] = orig_key
