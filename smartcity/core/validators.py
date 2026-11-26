from pathlib import Path

from django import forms


IMAGE_EXTENSIONS = {".bmp", ".gif", ".jpeg", ".jpg", ".png", ".webp"}


def validate_image_upload(image, *, label="L'image"):
    if not image:
        return image
    if Path(image.name).suffix.lower() not in IMAGE_EXTENSIONS:
        raise forms.ValidationError(f"{label} doit être au format JPG, PNG, GIF, BMP ou WebP.")
    if image.size > 8 * 1024 * 1024:
        raise forms.ValidationError(f"{label} est trop lourde (8 Mo maximum).")
    return image


def validate_tunisian_phone(phone):
    phone = phone.strip()
    if phone and (not phone.isascii() or not phone.isdigit() or len(phone) != 8):
        raise forms.ValidationError("Le numéro de téléphone doit contenir exactement 8 chiffres.")
    return phone
