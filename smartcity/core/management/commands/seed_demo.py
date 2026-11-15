"""Données de démonstration pour My City.

    python manage.py seed_demo          # ajoute les données (sans doublons)
    python manage.py seed_demo --clear  # retire uniquement ces données de démonstration
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from animaux.models import Observation
from evenements.models import Evenement
from infrastructures.models import Equipe, Signalement, Suivi
from marketplace.models import Produit
from mobilite.models import Reservation, Station, Transport

# (nom, adresse, latitude, longitude, {type: unités approuvées})
STATIONS = [
    ("La Marsa", "Marsa Plage, près de la gare TGM", 36.8782, 10.3247, {"velo": 8, "trottinette": 4}),
    ("Gammarth", "Avenue Taïeb Mhiri", 36.9106, 10.2870, {"velo": 5, "bus": 20}),
    ("La Goulette", "Près de la gare TGM", 36.8183, 10.3050, {"velo": 6}),
    ("Carthage", "Station Carthage Hannibal", 36.8528, 10.3233, {"trottinette": 6, "bus": 24}),
    ("Le Lac", "Les Berges du Lac 1", 36.8325, 10.2330, {"velo": 10, "trottinette": 8}),
    ("Tunis Centre", "Avenue Habib Bourguiba", 36.8002, 10.1858, {"velo": 12, "bus": 30}),
]
# (nom, responsable, téléphone, catégories traitées)
EQUIPES = [
    ("Équipe Éclairage", "Karim Trabelsi", "71 000 101", ["eclairage"]),
    ("Équipe Voirie", "Leïla Ben Salah", "71 000 102", ["voirie", "mobilier"]),
    ("Équipe Eau", "Mehdi Jaziri", "71 000 103", ["eau"]),
    ("Équipe Propreté", "Amira Chaouch", "71 000 104", ["dechets", "autre"]),
]
# (titre, catégorie, description, adresse, statut, priorité, latitude, longitude, message de l'administration)
SIGNALEMENTS = [
    ("Lampadaire en panne", "eclairage", "Le lampadaire devant l'école ne s'allume plus depuis trois jours.", "Rue Hédi Nouira, La Marsa", "ouvert", "moyenne", 36.8812, 10.3221, ""),
    ("Nid-de-poule dangereux", "voirie", "Un trou profond au milieu de la chaussée, les voitures font des écarts.", "Avenue de la République, Carthage", "en_cours", "urgente", 36.8556, 10.3262, "Une équipe de voirie interviendra cette semaine."),
    ("Banc cassé au parc", "mobilier", "Une latte du banc est arrachée, près de l'aire de jeux.", "Parc du Belvédère, Tunis", "resolu", "basse", 36.8236, 10.1772, "Le banc a été réparé. Merci pour votre signalement !"),
    ("Fuite d'eau sur le trottoir", "eau", "De l'eau coule en continu depuis une bouche sous le trottoir.", "Rue du Lac Biwa, Les Berges du Lac", "ouvert", "urgente", 36.8352, 10.2398, ""),
    ("Poubelles débordantes", "dechets", "Les conteneurs n'ont pas été vidés depuis le week-end.", "Avenue Franklin Roosevelt, La Goulette", "en_cours", "moyenne", 36.8160, 10.3045, "Le passage du camion a été demandé."),
]
EVENEMENTS = [  # (titre, description, lieu, décalage en jours, heure)
    ("Concert au théâtre", "Une soirée jazz avec des musiciens de la région. Entrée libre.", "Théâtre de My City", 3, 20),
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

        for nom, adresse, lat, lng, transports in STATIONS:
            station, created = Station.objects.get_or_create(nom=nom, defaults={"adresse": adresse, "latitude": lat, "longitude": lng})
            if created:
                for type_, n in transports.items():
                    Transport.objects.create(station=station, type=type_, unites_disponibles=n, statut="approuve", propose_par=admin)
        marsa = Station.objects.get(nom="La Marsa")
        # Une proposition de citoyen en attente, pour montrer l'approbation par l'administrateur.
        Transport.objects.get_or_create(station=marsa, type="bus", propose_par=citizen, defaults={"unites_disponibles": 12})
        for nom, resp, tel, cats in EQUIPES:
            Equipe.objects.get_or_create(nom=nom, defaults={"responsable": resp, "telephone": tel, "categories": cats})
        for i, (titre, cat, desc, adresse, statut, prio, lat, lng, msg) in enumerate(SIGNALEMENTS):
            auteur = citizen  # seuls les citoyens signalent
            s, created = Signalement.objects.get_or_create(
                titre=titre,
                defaults={"user": auteur, "categorie": cat, "description": desc, "adresse": adresse, "statut": statut, "priorite": prio, "latitude": lat, "longitude": lng, "equipe": Equipe.pour_categorie(cat)},
            )
            if created:
                Suivi.objects.create(signalement=s, statut="ouvert", equipe=s.equipe, auteur=auteur)
                if statut in ("en_cours", "resolu"):
                    Suivi.objects.create(signalement=s, statut="en_cours", equipe=s.equipe, auteur=admin, commentaire="" if statut == "resolu" else msg)
                if statut == "resolu":
                    Suivi.objects.create(signalement=s, statut="resolu", auteur=admin, commentaire=msg)
        # Signalements de démonstration du compte admin : rendus au citoyen (l'administration ne signale pas).
        Signalement.objects.filter(titre__in=[s[0] for s in SIGNALEMENTS], user=admin).update(user=citizen)
        for titre, desc, lieu, days, hour in EVENEMENTS:
            date = (now + timedelta(days=days)).replace(hour=hour, minute=0, second=0, microsecond=0)
            Evenement.objects.get_or_create(titre=titre, defaults={"organisateur": admin, "description": desc, "lieu": lieu, "date": date})
        for i, (espece, type_, desc, lieu) in enumerate(OBSERVATIONS):
            Observation.objects.get_or_create(espece=espece, lieu=lieu, defaults={"user": citizen if i % 2 == 0 else admin, "type": type_, "description": desc})
        for i, (titre, desc, prix) in enumerate(PRODUITS):
            Produit.objects.get_or_create(titre=titre, defaults={"vendeur": admin if i % 2 == 0 else citizen, "description": desc, "prix": prix})

        if not Reservation.objects.filter(user=citizen).exists():
            gammarth = Station.objects.get(nom="Gammarth")
            centre = Station.objects.get(nom="Tunis Centre")
            velo = Transport.objects.get(station=marsa, type="velo", statut="approuve")
            bus = Transport.objects.get(station=centre, type="bus", statut="approuve")
            Reservation.objects.create(user=citizen, depart=marsa, arrivee=gammarth, transport=velo, nombre=1, date_depart=(now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0))
            Reservation.objects.create(user=citizen, depart=centre, arrivee=marsa, transport=bus, nombre=2, statut="annulee", date_depart=(now - timedelta(days=4)).replace(hour=17, minute=30, second=0, microsecond=0))

        self.stdout.write(self.style.SUCCESS("Données de démonstration ajoutées."))

    def clear(self):
        stations = Station.objects.filter(nom__in=[s[0] for s in STATIONS])
        n = stations.delete()[0]  # retire aussi leurs transports et leurs réservations
        n += Signalement.objects.filter(titre__in=[s[0] for s in SIGNALEMENTS]).delete()[0]
        n += Equipe.objects.filter(nom__in=[e[0] for e in EQUIPES]).delete()[0]
        n += Evenement.objects.filter(titre__in=[e[0] for e in EVENEMENTS]).delete()[0]
        n += Observation.objects.filter(espece__in=[o[0] for o in OBSERVATIONS]).delete()[0]
        n += Produit.objects.filter(titre__in=[p[0] for p in PRODUITS]).delete()[0]
        self.stdout.write(self.style.SUCCESS(f"{n} élément(s) de démonstration retiré(s)."))
