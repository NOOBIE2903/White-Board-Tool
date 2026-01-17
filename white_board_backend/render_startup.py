import os
import sys
from django.core.management import execute_from_command_line

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "white_board_backend.settings")

def run():
    execute_from_command_line(["manage.py", "migrate", "--noinput"])

if __name__ == "__main__":
    run()
