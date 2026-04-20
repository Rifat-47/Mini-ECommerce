from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from catalog.models import Product, LOW_STOCK_THRESHOLD

User = get_user_model()


class Command(BaseCommand):
    help = 'Sends a low-stock alert email to all superadmins for products below the stock threshold.'

    def handle(self, *args, **kwargs):
        low_stock_products = Product.objects.filter(stock__lt=LOW_STOCK_THRESHOLD).order_by('stock')

        if not low_stock_products.exists():
            self.stdout.write(self.style.SUCCESS('No low-stock products found. No emails sent.'))
            return

        superadmins = User.objects.filter(role='superadmin', is_active=True)

        if not superadmins.exists():
            self.stdout.write(self.style.WARNING('No active superadmin users found. No emails sent.'))
            return

        # Build the email body
        product_lines = '\n'.join(
            f'  - {p.name} (ID: {p.id}) — {p.stock} unit(s) remaining'
            for p in low_stock_products
        )
        subject = f'Low Stock Alert — {low_stock_products.count()} product(s) need restocking'
        message = (
            f'Hello,\n\n'
            f'The following {low_stock_products.count()} product(s) are below the stock threshold '
            f'of {LOW_STOCK_THRESHOLD} units and require attention:\n\n'
            f'{product_lines}\n\n'
            f'Please restock them at your earliest convenience.\n\n'
            f'— E-Commerce System'
        )

        count = 0
        for admin in superadmins:
            try:
                send_mail(
                    subject,
                    message,
                    'noreply@ecommerce.com',
                    [admin.email],
                    fail_silently=False,
                )
                count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error sending alert to {admin.email}: {e}'))

        self.stdout.write(self.style.SUCCESS(
            f'Low-stock alert sent to {count} superadmin(s) for {low_stock_products.count()} product(s).'
        ))
