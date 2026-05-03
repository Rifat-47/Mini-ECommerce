from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create the platform root admin account.'

    def add_arguments(self, parser):
        parser.add_argument('--email',    required=True)
        parser.add_argument('--password', required=True)
        parser.add_argument('--first-name', default='')
        parser.add_argument('--last-name',  default='')

    def handle(self, *args, **options):
        email = options['email']
        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'User {email} already exists.'))
            return

        User.objects.create_user(
            email=email,
            password=options['password'],
            role='platform_admin',
            is_staff=True,
            is_superuser=True,
            first_name=options['first_name'],
            last_name=options['last_name'],
        )
        self.stdout.write(self.style.SUCCESS(f'Platform admin created: {email}'))
