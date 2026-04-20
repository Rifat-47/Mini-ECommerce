from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0006_order_user_set_null'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='coupon',
            name='user',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='personal_coupons',
                to=settings.AUTH_USER_MODEL,
                help_text='Assign to a specific user. Leave blank for public coupons.',
            ),
        ),
    ]
