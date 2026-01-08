from django.core.management.base import BaseCommand

from users.models import User


class Command(BaseCommand):
    help = "Create a new department head user"

    def add_arguments(self, parser):
        parser.add_argument(
            "username", type=str, help="Username for the department head"
        )
        parser.add_argument("email", type=str, help="Email for the department head")
        parser.add_argument(
            "password", type=str, help="Password for the department head"
        )
        parser.add_argument("--first-name", type=str, default="", help="First name")
        parser.add_argument("--last-name", type=str, default="", help="Last name")
        parser.add_argument(
            "--department", type=str, default="", help="Department name"
        )
        parser.add_argument(
            "--university", type=str, default="", help="University name"
        )

    def handle(self, *args, **options):
        username = options["username"]
        email = options["email"]
        password = options["password"]
        first_name = options.get("first_name", "")
        last_name = options.get("last_name", "")
        department = options.get("department", "")
        university = options.get("university", "")

        # Check if user already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.ERROR(f'Username "{username}" already exists'))
            return

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.ERROR(f'Email "{email}" already exists'))
            return

        # Create the user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            department=department,
            university=university,
            role="department_head",
            is_active=True,
        )

        self.stdout.write(
            self.style.SUCCESS(f"Successfully created department head user: {username}")
        )
        self.stdout.write(f"Email: {email}")
        if first_name or last_name:
            self.stdout.write(f"Name: {first_name} {last_name}".strip())
        if department:
            self.stdout.write(f"Department: {department}")
        if university:
            self.stdout.write(f"University: {university}")
