from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('stores', '0001_initial'),
    ]
    operations = [
        migrations.RemoveField(model_name='storesettings', name='store_name'),
    ]
