from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_add_useraddress_model'),
    ]

    operations = [
        # Account lockout fields
        migrations.AddField(
            model_name='user',
            name='failed_login_attempts',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='user',
            name='lockout_until',
            field=models.DateTimeField(blank=True, null=True),
        ),
        # 2FA fields
        migrations.AddField(
            model_name='user',
            name='totp_secret',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
        migrations.AddField(
            model_name='user',
            name='totp_enabled',
            field=models.BooleanField(default=False),
        ),
        # AuditLog model
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[
                    ('order_status_update', 'Order Status Update'),
                    ('order_bulk_update', 'Order Bulk Update'),
                    ('return_decision', 'Return Decision'),
                    ('refund_marked', 'Refund Marked Complete'),
                    ('product_create', 'Product Created'),
                    ('product_update', 'Product Updated'),
                    ('product_delete', 'Product Deleted'),
                    ('product_bulk_update', 'Product Bulk Update'),
                    ('stock_adjust', 'Stock Manual Adjustment'),
                    ('user_create', 'User Created'),
                    ('user_update', 'User Updated'),
                    ('user_delete', 'User Deleted'),
                    ('coupon_create', 'Coupon Created'),
                    ('coupon_update', 'Coupon Updated'),
                    ('coupon_delete', 'Coupon Deleted'),
                ], max_length=30)),
                ('target_type', models.CharField(help_text="e.g. 'Order', 'Product', 'User'", max_length=50)),
                ('target_id', models.PositiveIntegerField(blank=True, null=True)),
                ('detail', models.TextField(blank=True, default='', help_text='Human-readable summary of what changed.')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('admin', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
