# Generated manually on 2026-04-17

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0003_review'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to='product_images/')),
                ('is_primary', models.BooleanField(default=False)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('product', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='images',
                    to='catalog.product',
                )),
            ],
        ),
    ]
