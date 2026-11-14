# Smart City (Django)

```bash
python -m venv .venv && source .venv/bin/activate   # Windows : .venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations accounts mobilite infrastructures evenements animaux marketplace
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
Placez une photo dans `static/img/hero.jpg` pour l'image de la page d'accueil.
