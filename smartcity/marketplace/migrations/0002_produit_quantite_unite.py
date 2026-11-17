from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='produit',
            name='quantite',
            field=models.DecimalField(decimal_places=2, default=1, max_digits=10, verbose_name='Quantité'),
        ),
        migrations.AddField(
            model_name='produit',
            name='unite',
            field=models.CharField(
                choices=[
                    ('piece', 'Pièce'),
                    ('kg', 'Kilogramme (kg)'),
                    ('g', 'Gramme (g)'),
                    ('litre', 'Litre (L)'),
                    ('cl', 'Centilitre (cl)'),
                    ('boite', 'Boîte'),
                    ('sachet', 'Sachet'),
                    ('botte', 'Botte'),
                ],
                default='piece',
                max_length=20,
                verbose_name='Unité',
            ),
        ),
        migrations.CreateModel(
            name='PanierItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantite', models.PositiveIntegerField(default=1)),
                ('added_at', models.DateTimeField(auto_now_add=True)),
                ('produit', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='panier_items', to='marketplace.produit')),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='panier_items', to='auth.user')),
            ],
            options={
                'unique_together': {('user', 'produit')},
                'ordering': ['-added_at'],
            },
        ),
    ]
