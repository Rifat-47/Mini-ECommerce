import os
from django.apps import AppConfig


class UsersConfig(AppConfig):
    name = 'users'

    def ready(self):
        # We start the scheduler only when the main app handles the request to avoid starting it multiple times
        # when running the development server (which triggers the ready method twice via the reloader).
        if os.environ.get('RUN_MAIN') == 'true':
            from . import scheduler
            scheduler.start()
