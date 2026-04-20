# Generated manually on 2026-04-17

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_coupon_order_coupon_order_discount_amount'),
    ]

    operations = [
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(
                choices=[
                    ('Pending', 'Pending'),
                    ('In-Progress', 'In-Progress'),
                    ('Delivered', 'Delivered'),
                    ('Cancelled', 'Cancelled'),
                ],
                default='Pending',
                max_length=20,
            ),
        ),
    ]
