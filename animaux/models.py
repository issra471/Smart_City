"""Animaux : deux sortes de signalement, placés sur la carte par les citoyens.

- Animal en difficulté (blessé, errant, en danger, mort) : confié à un partenaire et suivi jusqu'au résultat.
- Observation (« j'ai vu cet animal ici ») : simplement partagée sur la carte, sans suivi.
"""
from django.conf import settings
from django.db import models
from django.utils import timezone


class Partenaire(models.Model):
    """Un partenaire de la ville (vétérinaire, association...). Les cas qu'il traite lui sont confiés automatiquement."""

    nom = models.CharField("Nom du partenaire", max_length=100, unique=True)
    responsable = models.CharField("Responsable", max_length=100, blank=True)
    telephone = models.CharField("Téléphone", max_length=30, blank=True)
    categories = models.JSONField("Cas traités", default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nom"]

    def __str__(self):
        return self.nom

    @classmethod
    def pour_cas(cls, cas):
        return next((p for p in cls.objects.all() if cas in p.categories), None)


class Observation(models.Model):
    CAS = [
        ("blesse", "Animal blessé"),
        ("errant", "Animal errant"),
        ("danger", "Animal en danger"),
        ("mort", "Animal mort"),
        ("observation", "Observation"),
    ]
    URGENCES = {"blesse", "errant", "danger", "mort"}  # cas qui demandent une intervention
    ANIMAUX = [
        ("chien", "Chien"),
        ("chat", "Chat"),
        ("oiseau", "Oiseau"),
        ("tortue", "Tortue"),
        ("petit", "Petit mammifère"),
        ("autre", "Autre"),
    ]
    STATUTS = [("ouvert", "Signalé"), ("en_cours", "Pris en charge"), ("resolu", "Résolu"), ("rejete", "Rejeté")]
    PRIORITES = [("basse", "Basse"), ("moyenne", "Moyenne"), ("urgente", "Urgente")]
    RESULTATS = [
        ("soigne", "Soigné"),
        ("recueilli", "Recueilli par une association"),
        ("relache", "Relâché dans la nature"),
        ("adopte", "Adopté"),
        ("retire", "Retiré de la voie publique"),
        ("decede", "Décédé"),
        ("introuvable", "Introuvable sur place"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="observations")
    cas = models.CharField("Type de cas", max_length=20, choices=CAS, default="observation")
    animal = models.CharField("Animal", max_length=20, choices=ANIMAUX, default="autre")
    espece = models.CharField("Espèce ou description courte", max_length=100, blank=True)
    nombre = models.PositiveIntegerField("Nombre d'animaux", default=1)
    vu_le = models.DateTimeField("Vu le", default=timezone.now)
    description = models.TextField("Description", blank=True)
    lieu = models.CharField("Adresse ou repère", max_length=200, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    photo = models.ImageField("Photo", upload_to="animaux/", blank=True)
    statut = models.CharField(max_length=20, choices=STATUTS, default="ouvert")
    priorite = models.CharField("Priorité", max_length=20, choices=PRIORITES, default="moyenne")
    resultat = models.CharField("Résultat", max_length=20, choices=RESULTATS, blank=True)
    partenaire = models.ForeignKey(Partenaire, on_delete=models.SET_NULL, null=True, blank=True, related_name="cas_confies", verbose_name="Partenaire")
    soutiens = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="animaux_vus_aussi")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.titre

    JOURS_RETARD = 1  # un animal en difficulté encore « Signalé » après 24 h est en retard

    @property
    def urgence(self):
        return self.cas in self.URGENCES

    @property
    def titre(self):
        return self.espece or f"{self.get_animal_display()} — {self.get_cas_display().lower()}"

    @property
    def en_retard(self):
        return self.urgence and self.statut == "ouvert" and (timezone.now() - self.created_at).days >= self.JOURS_RETARD

    @property
    def termine(self):
        return self.statut in ("resolu", "rejete")

    def priorite_initiale(self):
        return "urgente" if self.cas in ("blesse", "danger") else "moyenne"

    def modifiable_par(self, user):
        """L'auteur modifie son observation, ou son signalement tant qu'il n'est pas pris en charge."""
        if not user.is_authenticated or user.pk != self.user_id:
            return False
        return not self.urgence or self.statut == "ouvert"

    def supprimable_par(self, user):
        return user.is_authenticated and (user.is_staff or self.modifiable_par(user))

    # Cartes génériques (tableau de bord, profil)
    @property
    def card_image(self): return self.photo.url if self.photo else None
    @property
    def card_title(self): return self.titre
    @property
    def card_meta(self): return f"{self.get_cas_display()} · {self.lieu}"
    @property
    def card_text(self): return self.description


class SuiviAnimal(models.Model):
    """Une étape du suivi d'un animal en difficulté : statut, partenaire, message de la ville."""

    observation = models.ForeignKey(Observation, on_delete=models.CASCADE, related_name="suivis")
    statut = models.CharField(max_length=20, choices=Observation.STATUTS)
    commentaire = models.TextField(blank=True)
    partenaire = models.ForeignKey(Partenaire, on_delete=models.SET_NULL, null=True, blank=True)
    auteur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "pk"]
