from django.db import migrations


class Migration(migrations.Migration):
    """
    Drop the orphaned authtoken_token table left over from an earlier
    rest_framework.authtoken installation. The project uses simplejwt
    exclusively; this table's FK on users_user.id blocks bulk user deletion.
    """

    dependencies = [
        ('users', '0003_security_enhancements'),
    ]

    operations = [
        migrations.RunSQL(
            sql="DROP TABLE IF EXISTS authtoken_token;",
            reverse_sql="",  # irreversible — table was already orphaned
        ),
    ]
