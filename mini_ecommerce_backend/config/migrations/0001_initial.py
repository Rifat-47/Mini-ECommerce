from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='SiteSettings',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('store_name', models.CharField(default='Ethereal Asteroid', max_length=100)),
                ('support_email', models.EmailField(default='support@ethereal-asteroid.com', max_length=254)),
                ('from_email', models.EmailField(default='noreply@ecommerce.com', max_length=254)),
                ('contact_phone', models.CharField(blank=True, default='', max_length=30)),
                ('currency', models.CharField(default='BDT', max_length=10)),
                ('tax_rate', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('return_window_days', models.PositiveIntegerField(default=7)),
                ('free_shipping_threshold', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('birthday_coupon_enabled', models.BooleanField(default=True)),
                ('birthday_coupon_discount', models.PositiveIntegerField(default=20)),
                ('birthday_coupon_validity_days', models.PositiveIntegerField(default=30)),
                ('cod_enabled', models.BooleanField(default=True)),
                ('online_payment_enabled', models.BooleanField(default=True)),
                ('cod_min_order_value', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('email_notifications_enabled', models.BooleanField(default=True)),
                ('registration_enabled', models.BooleanField(default=True)),
                ('max_login_attempts', models.PositiveIntegerField(default=5)),
                ('lockout_minutes', models.PositiveIntegerField(default=15)),
            ],
            options={
                'verbose_name': 'Site Settings',
                'verbose_name_plural': 'Site Settings',
            },
        ),
    ]
