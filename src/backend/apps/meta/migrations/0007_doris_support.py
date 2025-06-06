# Generated by Django 3.2.23 on 2025-02-25 09:16

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('meta', '0006_auto_20240924_2356'),
    ]

    operations = [
        migrations.AddField(
            model_name='field',
            name='is_index',
            field=models.BooleanField(default=True, verbose_name='是否索引'),
        ),
        migrations.AddField(
            model_name='field',
            name='is_zh_analyzed',
            field=models.BooleanField(default=False, verbose_name='是否中文分词'),
        ),
    ]
