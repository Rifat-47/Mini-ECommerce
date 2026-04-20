from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0004_productimage'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='StockMovement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('change_type', models.CharField(choices=[
                    ('sale', 'Sale (Order Placed)'),
                    ('cancel', 'Stock Restored (Order Cancelled)'),
                    ('return', 'Stock Restored (Return Approved)'),
                    ('manual_add', 'Manual Adjustment — Add'),
                    ('manual_remove', 'Manual Adjustment — Remove'),
                    ('bulk_update', 'Bulk Update'),
                ], max_length=20)),
                ('quantity_change', models.IntegerField(help_text='Positive = stock added, negative = stock removed.')),
                ('stock_after', models.IntegerField(help_text='Stock level immediately after this movement.')),
                ('reason', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stock_movements', to='catalog.product')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='stock_movements', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
