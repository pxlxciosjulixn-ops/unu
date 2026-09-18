"""
Limites de caracteres de la hoja de vida.

Un solo lugar para todos: de aqui salen los `max_length` de los modelos, las
validaciones de la API y los contadores del formulario del editor (el frontend
los recibe en `GET /api/resume/`). Si un texto se alarga y desborda su caja en
la pagina, el numero se cambia aqui y las tres capas quedan de acuerdo.

`max_items` es cuantos elementos acepta la lista, no caracteres.
"""

LIMITES: dict[str, dict[str, int]] = {
    "profile": {
        "first_name": 40,
        "last_name": 40,
        "title": 60,
        "initials": 4,
        "address": 160,
        "phone": 30,
        "email": 90,
        "website": 200,
        "website_label": 60,
        "website_note": 90,
        "summary": 400,
    },
    "about": {
        "title": 70,
        "text": 320,
        "max_items": 8,
    },
    "skill_groups": {
        "name": 40,
        "skill": 28,
        "max_skills": 12,
        "max_items": 6,
    },
    "languages": {
        "name": 30,
        "max_items": 6,
    },
    "personal_details": {
        "label": 40,
        "value": 60,
        "max_items": 6,
    },
    "references": {
        "name": 70,
        "relation": 50,
        "phone": 30,
        "email": 90,
        "max_items": 6,
    },
    "experiences": {
        "role": 70,
        "company": 90,
        "location": 50,
        "start": 7,
        "end": 7,
        "bullet": 420,
        "max_bullets": 8,
        "tech": 28,
        "max_stack": 14,
        "max_items": 10,
    },
    "education": {
        "title": 90,
        "institution": 60,
        "location": 50,
        "year": 12,
        "description": 600,
        "max_items": 12,
    },
}

# Formacion y certificaciones son el mismo modelo y comparten limites.
LIMITES["certifications"] = LIMITES["education"]
