"""Pont entre les vues Django et les pages React (Inertia).

- `InertiaMixin` : une vue Django classique (ListView, CreateView, LoginView...)
  rend une page React au lieu d'un template HTML. Toute la logique de la vue
  (permissions, validation, redirections) reste celle de Django.
- `serialize_form` : transforme un formulaire Django en données JSON, pour que
  le composant React `DjangoForm` puisse afficher n'importe quel formulaire
  (champs, valeurs, erreurs) sans le réécrire à la main.
"""
import datetime
import re

from django import forms
from django.utils import timezone
from django.utils.html import strip_tags
from inertia import render as inertia_render

_ATTRS = ("maxlength", "min", "max", "step", "autocomplete", "placeholder")


def iso(value):
    """Date/heure -> texte ISO (heure locale) pour l'affichage côté React."""
    if value is None:
        return None
    if isinstance(value, datetime.datetime) and timezone.is_aware(value):
        value = timezone.localtime(value)
    return value.isoformat()


def display_name(user):
    return user.get_full_name() or user.get_username()


def _field_type(bound):
    field, widget = bound.field, bound.field.widget
    if isinstance(widget, forms.Textarea):
        return "textarea"
    if isinstance(widget, forms.CheckboxInput):
        return "checkbox"
    if isinstance(widget, forms.FileInput):
        return "file"
    if isinstance(widget, forms.Select):
        return "select"
    if isinstance(widget, forms.PasswordInput):
        return "password"
    if widget.attrs.get("type"):
        return widget.attrs["type"]
    if isinstance(field, forms.DateTimeField):
        return "datetime-local"
    if isinstance(field, forms.DateField):
        return "date"
    if isinstance(field, forms.EmailField):
        return "email"
    if isinstance(field, (forms.IntegerField, forms.DecimalField, forms.FloatField)):
        return "number"
    return "text"


def _field_value(bound, kind):
    if kind in ("password", "file"):
        return ""
    value = bound.value()
    if kind == "checkbox":
        return bool(value)
    if value is None:
        return ""
    if isinstance(value, datetime.datetime):
        if timezone.is_aware(value):
            value = timezone.localtime(value)
        return value.strftime("%Y-%m-%dT%H:%M")
    if isinstance(value, datetime.date):
        return value.isoformat()
    return str(value)


def _help(text):
    text = re.sub(r"</li>\s*<li>", " · ", str(text or ""))
    return strip_tags(text).strip()


def serialize_form(form):
    fields = []
    for bound in form:
        kind = _field_type(bound)
        widget = bound.field.widget
        attrs = {**bound.field.widget_attrs(widget), **widget.attrs}
        item = {
            "name": bound.html_name,
            "label": str(bound.label),
            "type": kind,
            "value": _field_value(bound, kind),
            "required": bound.field.required,
            "help": _help(bound.help_text),
            "errors": [str(e) for e in bound.errors],
            "attrs": {k: attrs[k] for k in _ATTRS if k in attrs},
        }
        if kind == "select":
            item["choices"] = [{"value": str(v), "label": str(label)} for v, label in bound.field.choices]
        if kind == "file" and isinstance(bound.field, forms.ImageField):
            item["image"] = True
        fields.append(item)
    return {"fields": fields, "errors": [str(e) for e in form.non_field_errors()]}


class InertiaMixin:
    """À placer AVANT la vue Django : `class Page(InertiaMixin, ListView)`."""

    component = ""  # ex. "Mobilite/Stations" -> frontend/pages/Mobilite/Stations.jsx

    def get_props(self, context):
        return {}

    def render_to_response(self, context, **response_kwargs):
        return inertia_render(self.request, self.component, self.get_props(context))


class InertiaFormMixin(InertiaMixin):
    """Pour les vues avec formulaire : ajoute `form` aux données de la page."""

    def get_props(self, context):
        form = context.get("form")
        return {"form": serialize_form(form) if form is not None else None}
