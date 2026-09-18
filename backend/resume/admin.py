"""La hoja de vida tambien se puede corregir desde el admin de Django."""

from django.contrib import admin

from resume import models


@admin.register(models.ResumeProfile)
class ResumeProfileAdmin(admin.ModelAdmin):
    list_display = ["first_name", "last_name", "title", "updated_at"]

    def has_add_permission(self, request) -> bool:
        # El perfil es uno solo: si ya existe, se edita, no se agrega otro.
        return not models.ResumeProfile.objects.exists()


@admin.register(models.Highlight)
class HighlightAdmin(admin.ModelAdmin):
    list_display = ["title", "order"]
    list_editable = ["order"]


@admin.register(models.SkillGroup)
class SkillGroupAdmin(admin.ModelAdmin):
    list_display = ["name", "skills", "order"]
    list_editable = ["order"]


@admin.register(models.Language)
class LanguageAdmin(admin.ModelAdmin):
    list_display = ["name", "level", "order"]
    list_editable = ["order"]


@admin.register(models.PersonalDetail)
class PersonalDetailAdmin(admin.ModelAdmin):
    list_display = ["label", "value", "order"]
    list_editable = ["order"]


@admin.register(models.Reference)
class ReferenceAdmin(admin.ModelAdmin):
    list_display = ["name", "relation", "order"]
    list_editable = ["order"]


@admin.register(models.Experience)
class ExperienceAdmin(admin.ModelAdmin):
    list_display = ["role", "company", "start", "end", "current", "order"]
    list_editable = ["order"]
    list_filter = ["current"]


@admin.register(models.Formation)
class FormationAdmin(admin.ModelAdmin):
    list_display = ["title", "institution", "kind", "year", "order"]
    list_editable = ["order"]
    list_filter = ["kind"]
