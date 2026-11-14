"""Données de démonstration pour Valmont.

    python manage.py seed_demo          # ajoute les données (sans doublons)
    python manage.py seed_demo --clear  # retire uniquement ces données de démonstration
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from animaux.models import Observation
from evenements.models import Evenement
from infrastructures.models import Signalement
from marketplace.models import Produit
from mobilite.models import Reservation, Station

STATIONS = [
    ("Station Gare centrale", "velo", "Place de la Gare", 12),
    ("Station Parc des Tilleuls", "velo", "Entrée nord du parc", 2),
    ("Trottinettes Mairie", "trottinette", "12 avenue de la République", 8),
    ("Navette électrique Centre", "bus", "Arrêt Hôtel de Ville", 24),
    ("Covoiturage Marché", "covoiturage", "Parking du marché couvert", 5),
    ("Station Théâtre", "velo", "Rue des Arts", 0),
]
SIGNALEMENTS = [
    ("Lampadaire en panne", "eclairage", "Le lampadaire devant l'école ne s'allume plus depuis trois jours.", "Rue des Écoles", "ouvert"),
    ("Nid-de-poule dangereux", "voirie", "Un trou profond au milieu de la chaussée, juste après le pont.", "Avenue du Pont", "en_cours"),
    ("Banc cassé au parc", "mobilier", "Une latte du banc est arrachée, près de l'étang.", "Parc des Tilleuls", "resolu"),
    ("Passage piéton effacé", "voirie", "Le marquage au sol n'est presque plus visible.", "Place de la Gare", "ouvert"),
    ("Poubelle débordante", "autre", "La corbeille n'a pas été vidée depuis le week-end.", "Rue des Arts", "en_cours"),
]
EVENEMENTS = [  # (titre, description, lieu, décalage en jours, heure)
    ("Concert au théâtre", "Une soirée jazz avec des musiciens de la région. Entrée libre.", "Théâtre de Valmont", 3, 20),
    ("Marché des producteurs", "Fruits, légumes, miel et pain : les producteurs locaux vous attendent.", "Place du marché", 6, 9),
    ("Balade nature guidée", "Deux heures de marche pour découvrir les oiseaux du parc.", "Parc des Tilleuls", 10, 10),
    ("Atelier réparation de vélos", "Apportez votre vélo, repartez avec un vélo qui roule.", "Station Gare centrale", 15, 14),
    ("Fête des voisins", "Un grand repas partagé entre habitants du quartier.", "Rue des Écoles", -12, 19),
]
OBSERVATIONS = [
    ("Hérisson", "observation", "Vu au crépuscule le long de la haie.", "Parc des Tilleuls"),
    ("Cigogne blanche", "observation", "Un couple posé sur le toit de la mairie.", "Hôtel de Ville"),
    ("Chat blessé", "soin", "Boite de la patte arrière, reste près des poubelles.", "Rue des Arts"),
    ("Canards colverts", "observation", "Une famille avec six canetons sur l'étang.", "Étang du parc"),
]
PRODUITS = [
    ("Miel de fleurs", "Miel artisanal récolté cet été, pot de 500 g.", "18.00"),
    ("Panier de légumes", "Légumes de saison cueillis le matin même.", "25.50"),
    ("Pain au levain", "Pain de campagne cuit au feu de bois.", "4.50"),
    ("Huile d'olive", "Première pression à froid, bouteille d'un litre.", "32.00"),
    ("Confiture de figues", "Recette familiale, pot de 350 g.", "9.00"),
]


class Command(BaseCommand):
    help = "Ajoute (ou retire avec --clear) des données de démonstration."

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Retire les données de démonstration.")

    def handle(self, *args, **options):
        if options["clear"]:
            return self.clear()

        User = get_user_model()
        try:
            citizen = User.objects.get(username="citoyen")
        except User.DoesNotExist:
            raise CommandError("Le compte « citoyen » n'existe pas.")
        admin = User.objects.filter(username="admin").first() or citizen
        now = timezone.now()

        for nom, type_, adresse, n in STATIONS:
            Station.objects.get_or_create(nom=nom, defaults={"type": type_, "adresse": adresse, "unites_disponibles": n})
        for i, (titre, cat, desc, adresse, statut) in enumerate(SIGNALEMENTS):
            Signalement.objects.get_or_create(titre=titre, defaults={"user": citizen if i % 2 == 0 else admin, "categorie": cat, "description": desc, "adresse": adresse, "statut": statut})
        for titre, desc, lieu, days, hour in EVENEMENTS:
            date = (now + timedelta(days=days)).replace(hour=hour, minute=0, second=0, microsecond=0)
            Evenement.objects.get_or_create(titre=titre, defaults={"organisateur": admin, "description": desc, "lieu": lieu, "date": date})
        for i, (espece, type_, desc, lieu) in enumerate(OBSERVATIONS):
            Observation.objects.get_or_create(espece=espece, lieu=lieu, defaults={"user": citizen if i % 2 == 0 else admin, "type": type_, "description": desc})
        for i, (titre, desc, prix) in enumerate(PRODUITS):
            Produit.objects.get_or_create(titre=titre, defaults={"vendeur": admin if i % 2 == 0 else citizen, "description": desc, "prix": prix})

        if not Reservation.objects.filter(user=citizen).exists():
            gare = Station.objects.get(nom="Station Gare centrale")
            navette = Station.objects.get(nom="Navette électrique Centre")
            Reservation.objects.create(user=citizen, station=gare, nombre=1, date_depart=(now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0))
            Reservation.objects.create(user=citizen, station=navette, nombre=2, statut="annulee", date_depart=(now - timedelta(days=4)).replace(hour=17, minute=30, second=0, microsecond=0))

        self.stdout.write(self.style.SUCCESS("Données de démonstration ajoutées."))

    def clear(self):
        stations = Station.objects.filter(nom__in=[s[0] for s in STATIONS])
        n = Reservation.objects.filter(station__in=stations).delete()[0]
        n += stations.delete()[0]
        n += Signalement.objects.filter(titre__in=[s[0] for s in SIGNALEMENTS]).delete()[0]
        n += Evenement.objects.filter(titre__in=[e[0] for e in EVENEMENTS]).delete()[0]
        n += Observation.objects.filter(espece__in=[o[0] for o in OBSERVATIONS]).delete()[0]
        n += Produit.objects.filter(titre__in=[p[0] for p in PRODUITS]).delete()[0]
        self.stdout.write(self.style.SUCCESS(f"{n} élément(s) de démonstration retiré(s)."))
