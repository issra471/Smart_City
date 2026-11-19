"""Données de démonstration pour My City.

    python manage.py seed_demo          # ajoute les données (sans doublons)
    python manage.py seed_demo --clear  # retire uniquement ces données de démonstration
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from animaux.models import Observation, Partenaire, SuiviAnimal
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
# (nom, responsable, téléphone, cas traités)
PARTENAIRES = [
    ("Vétérinaire de garde", "Dr Nadia Gharbi", "71 000 201", ["blesse"]),
    ("Association protection animale", "Youssef Mabrouk", "71 000 202", ["errant", "danger"]),
    ("Service d'hygiène", "Hichem Ayari", "71 000 203", ["mort"]),
    ("Service environnement", "Rim Haddad", "71 000 204", []),
]
# (espèce, cas, animal, nombre, description, lieu, lat, lng, statut, résultat, message)
OBSERVATIONS = [
    ("Chat blessé à la patte", "blesse", "chat", 1, "Il boite de la patte arrière et reste caché près des poubelles.", "Rue Hédi Nouira, La Marsa", 36.8798, 10.3236, "en_cours", "", "Le vétérinaire passe cet après-midi."),
    ("Chiens errants", "errant", "chien", 3, "Trois chiens errants près de l'arrêt de bus, ils aboient sur les passants.", "Avenue Habib Bourguiba, Tunis", 36.8008, 10.1820, "ouvert", "", ""),
    ("Tortue sur la route", "danger", "tortue", 1, "Une tortue traverse la route principale, risque d'être écrasée.", "Route de la Corniche, Gammarth", 36.9080, 10.2905, "resolu", "relache", "Tortue déplacée dans le jardin voisin et relâchée. Merci !"),
    ("Flamants roses", "observation", "oiseau", 25, "Un groupe de flamants roses en train de se nourrir au bord du lac.", "Lac de Tunis, Les Berges du Lac", 36.8310, 10.2280, "ouvert", "", ""),
    ("Hérisson", "observation", "petit", 1, "Vu au crépuscule le long de la haie du parc.", "Parc du Belvédère, Tunis", 36.8248, 10.1760, "ouvert", "", ""),
    ("Cigognes blanches", "observation", "oiseau", 2, "Un couple posé sur un lampadaire.", "Carthage Hannibal", 36.8540, 10.3240, "ouvert", "", ""),
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
        for nom, resp, tel, cas in PARTENAIRES:
            Partenaire.objects.get_or_create(nom=nom, defaults={"responsable": resp, "telephone": tel, "categories": cas})
        for i, (espece, cas, animal, nb, desc, lieu, lat, lng, statut, resultat, msg) in enumerate(OBSERVATIONS):
            o, created = Observation.objects.get_or_create(
                espece=espece,
                defaults={"user": citizen, "cas": cas, "animal": animal, "nombre": nb, "description": desc, "lieu": lieu, "latitude": lat, "longitude": lng, "statut": statut, "resultat": resultat, "vu_le": now - timedelta(hours=2 + i * 5)},
            )
            if created and o.urgence:
                o.priorite, o.partenaire = o.priorite_initiale(), Partenaire.pour_cas(cas)
                o.save()
                SuiviAnimal.objects.create(observation=o, statut="ouvert", partenaire=o.partenaire, auteur=citizen)
                if statut in ("en_cours", "resolu"):
                    SuiviAnimal.objects.create(observation=o, statut="en_cours", auteur=admin, commentaire="" if statut == "resolu" else msg)
                if statut == "resolu":
                    SuiviAnimal.objects.create(observation=o, statut="resolu", auteur=admin, commentaire=msg)
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
        n += Partenaire.objects.filter(nom__in=[p[0] for p in PARTENAIRES]).delete()[0]
        n += Produit.objects.filter(titre__in=[p[0] for p in PRODUITS]).delete()[0]
        self.stdout.write(self.style.SUCCESS(f"{n} élément(s) de démonstration retiré(s)."))
