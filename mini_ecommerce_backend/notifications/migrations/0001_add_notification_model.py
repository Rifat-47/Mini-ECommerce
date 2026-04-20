from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[
                    ('order_placed', 'Order Placed'),
                    ('order_status', 'Order Status Update'),
                    ('order_cancelled', 'Order Cancelled'),
                    ('return_received', 'Return Request Received'),
                    ('return_approved', 'Return Approved'),
                    ('return_rejected', 'Return Rejected'),
                    ('refund_completed', 'Refund Completed'),
                    ('payment_success', 'Payment Successful'),
                    ('payment_failed', 'Payment Failed'),
                    ('general', 'General'),
                ], max_length=30)),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
