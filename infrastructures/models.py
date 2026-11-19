from django.conf import settings
from django.db import models


class Equipe(models.Model):
    """Une équipe d'intervention de la ville. Les signalements de ses catégories lui sont affectés automatiquement."""

    nom = models.CharField("Nom de l'équipe", max_length=100, unique=True)
    responsable = models.CharField("Responsable", max_length=100, blank=True)
    telephone = models.CharField("Téléphone", max_length=30, blank=True)
    categories = models.JSONField("Catégories traitées", default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nom"]

    def __str__(self):
        return self.nom

    @classmethod
    def pour_categorie(cls, categorie):
        """Équipe proposée pour une catégorie (la première qui la traite)."""
        return next((e for e in cls.objects.all() if categorie in e.categories), None)


class Signalement(models.Model):
    """Un problème dans l'espace public, placé sur la carte par un citoyen et suivi par l'administration."""

    CATEGORIES = [
        ("voirie", "Voirie"),
        ("eclairage", "Éclairage"),
        ("mobilier", "Mobilier urbain"),
        ("eau", "Eau et fuites"),
        ("dechets", "Déchets"),
        ("autre", "Autre"),
    ]
    STATUTS = [("ouvert", "Ouvert"), ("en_cours", "En cours"), ("resolu", "Résolu")]
    PRIORITES = [("basse", "Basse"), ("moyenne", "Moyenne"), ("urgente", "Urgente")]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="signalements")
    titre = models.CharField("Titre", max_length=150)
    categorie = models.CharField("Catégorie", max_length=20, choices=CATEGORIES)
    description = models.TextField("Description")
    adresse = models.CharField("Adresse ou repère", max_length=200, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    photo = models.ImageField("Photo", upload_to="signalements/", blank=True)
    photo_apres = models.ImageField("Photo après intervention", upload_to="signalements/", blank=True)
    statut = models.CharField(max_length=20, choices=STATUTS, default="ouvert")
    priorite = models.CharField("Priorité", max_length=20, choices=PRIORITES, default="moyenne")
    equipe = models.ForeignKey(Equipe, on_delete=models.SET_NULL, null=True, blank=True, related_name="signalements", verbose_name="Équipe")
    soutiens = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="signalements_soutenus")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.titre

    JOURS_RETARD = 3  # un signalement encore « Ouvert » après ce délai est en retard

    @property
    def en_retard(self):
        from django.utils import timezone

        return self.statut == "ouvert" and (timezone.now() - self.created_at).days >= self.JOURS_RETARD

    def modifiable_par(self, user):
        """L'auteur peut modifier tant que les équipes n'ont pas commencé."""
        return user.is_authenticated and user.pk == self.user_id and self.statut == "ouvert"

    def supprimable_par(self, user):
        return user.is_authenticated and (user.is_staff or (user.pk == self.user_id and self.statut == "ouvert"))

    @property
    def card_image(self): return self.photo.url if self.photo else None
    @property
    def card_title(self): return self.titre
    @property
    def card_meta(self): return f"{self.get_categorie_display()} · {self.get_statut_display()}"
    @property
    def card_text(self): return self.description


class Suivi(models.Model):
    """Une étape du suivi d'un signalement : changement de statut et/ou message de l'administration."""

    signalement = models.ForeignKey(Signalement, on_delete=models.CASCADE, related_name="suivis")
    statut = models.CharField(max_length=20, choices=Signalement.STATUTS)
    commentaire = models.TextField(blank=True)
    equipe = models.ForeignKey(Equipe, on_delete=models.SET_NULL, null=True, blank=True)  # renseignée quand le signalement est confié à une équipe
    auteur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "pk"]

    def __str__(self):
        return f"{self.signalement} · {self.get_statut_display()}"
