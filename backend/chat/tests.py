from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from chat import services, whatsapp
from chat.models import AnalisisConversacion, Conversation

CHAT_IPHONE = """\
Los mensajes y las llamadas están cifrados de extremo a extremo.
[9/21/26, 8:03:18 PM] Tú: holaaa, cómo estás?
[9/21/26, 10:16:41 PM] Ana: Holiii
[9/21/26, 10:16:58 PM] Ana: <sticker omitido>
[9/21/26, 10:17:30 PM] Ana: Bien, estaba cuadrando
para mudarme
"""

CHAT_ANDROID = """\
21/9/26, 20:03 - Tú: hola
21/9/26, 20:05 - Ana: ‎imagen omitida
21/9/26, 20:06 - Ana: qué más
"""


class LeerChatTests(TestCase):
    def test_iphone_quita_ruido_y_une_lineas(self):
        chat = whatsapp.leer_chat(CHAT_IPHONE)
        self.assertEqual(chat.participantes, ["Tú", "Ana"])
        self.assertEqual(len(chat.lineas), 3)
        self.assertIn("cuadrando\npara mudarme", chat.contenido)
        self.assertNotIn("sticker", chat.contenido)

    def test_android(self):
        chat = whatsapp.leer_chat(CHAT_ANDROID)
        self.assertEqual(chat.lineas[-1], "[21/9/26 20:06] Ana: qué más")
        self.assertEqual(len(chat.lineas), 2)

    def test_texto_cualquiera_no_es_un_chat(self):
        with self.assertRaises(whatsapp.ChatInvalido):
            whatsapp.leer_chat("lista del mercado\nleche\npan")


@override_settings(ALLOWED_HOSTS=["*"])
class ChatsContextoTests(TestCase):
    def setUp(self):
        self.mia = self.client_class(HTTP_X_FORWARDED_FOR="1.1.1.1")
        self.otra = self.client_class(HTTP_X_FORWARDED_FOR="2.2.2.2")

    def subir(self, cliente, nombre="chat.txt", datos=CHAT_IPHONE.encode()):
        return cliente.post(
            "/api/chat/analyses/", {"file": SimpleUploadedFile(nombre, datos)}
        )

    def test_solo_acepta_txt(self):
        self.assertEqual(self.subir(self.mia, "chat.pdf").status_code, 400)
        self.assertFalse(AnalisisConversacion.objects.exists())

    def test_cada_ip_ve_y_usa_solo_sus_chats(self):
        chat_id = self.subir(self.mia).json()["id"]

        self.assertEqual(len(self.mia.get("/api/chat/analyses/").json()["results"]), 1)
        self.assertEqual(self.otra.get("/api/chat/analyses/").json()["results"], [])
        respuesta = self.otra.post(
            "/api/chat/",
            {"message": "hola", "analysis_id": chat_id},
            content_type="application/json",
        )
        self.assertEqual(respuesta.status_code, 404)
        self.assertEqual(
            self.otra.delete(f"/api/chat/analyses/{chat_id}/").status_code, 404
        )

    def test_borrar_solo_oculta_y_todo_queda_en_la_base(self):
        chat_id = self.subir(self.mia).json()["id"]
        self.mia.post(
            "/api/chat/",
            {"message": "hola", "analysis_id": chat_id},
            content_type="application/json",
        )
        conversacion = Conversation.objects.get()

        self.assertEqual(
            self.mia.delete(f"/api/chat/conversations/{conversacion.id}/").status_code,
            204,
        )
        self.assertEqual(
            self.mia.delete(f"/api/chat/analyses/{chat_id}/").status_code, 204
        )

        # El visitante ya no los ve...
        self.assertEqual(self.mia.get("/api/chat/conversations/").json()["results"], [])
        self.assertEqual(self.mia.get("/api/chat/analyses/").json()["results"], [])
        self.assertEqual(
            self.mia.get(f"/api/chat/conversations/{conversacion.id}/").status_code, 404
        )
        # ...pero siguen en la base con sus mensajes.
        conversacion.refresh_from_db()
        self.assertIsNotNone(conversacion.borrada_en)
        self.assertTrue(conversacion.messages.exists())
        chat = AnalisisConversacion.objects.get(id=chat_id)
        self.assertIsNotNone(chat.borrado_en)
        self.assertIn("Holiii", chat.contenido)

    def test_papelera_y_restaurar(self):
        chat_id = self.subir(self.mia).json()["id"]
        self.mia.delete(f"/api/chat/analyses/{chat_id}/")

        papelera = self.mia.get("/api/chat/trash/").json()
        self.assertEqual([c["id"] for c in papelera["analyses"]], [chat_id])
        # Otra IP no ve la papelera ajena ni puede restaurar.
        self.assertEqual(self.otra.get("/api/chat/trash/").json()["analyses"], [])
        self.assertEqual(
            self.otra.post(f"/api/chat/analyses/{chat_id}/restore/").status_code, 404
        )

        self.assertEqual(
            self.mia.post(f"/api/chat/analyses/{chat_id}/restore/").status_code, 200
        )
        self.assertEqual(len(self.mia.get("/api/chat/analyses/").json()["results"]), 1)
        self.assertEqual(self.mia.get("/api/chat/trash/").json()["analyses"], [])

    def test_eliminar_definitivo_sale_de_la_papelera_pero_no_de_la_base(self):
        chat_id = self.subir(self.mia).json()["id"]
        # Solo se elimina lo que ya está en la papelera.
        self.assertEqual(
            self.mia.post(f"/api/chat/analyses/{chat_id}/purge/").status_code, 404
        )
        self.mia.delete(f"/api/chat/analyses/{chat_id}/")
        self.assertEqual(
            self.otra.post(f"/api/chat/analyses/{chat_id}/purge/").status_code, 404
        )
        self.assertEqual(
            self.mia.post(f"/api/chat/analyses/{chat_id}/purge/").status_code, 204
        )

        self.assertEqual(self.mia.get("/api/chat/trash/").json()["analyses"], [])
        self.assertEqual(
            self.mia.post(f"/api/chat/analyses/{chat_id}/restore/").status_code, 404
        )
        chat = AnalisisConversacion.objects.get(id=chat_id)
        self.assertIsNotNone(chat.eliminado_en)
        self.assertIn("Holiii", chat.contenido)

    def test_sin_chat_responde_la_frase_fija(self):
        respuesta = self.mia.post(
            "/api/chat/", {"message": "hazme una tarea"}, content_type="application/json"
        )
        cuerpo = b"".join(respuesta.streaming_content).decode()
        self.assertIn("no para sus maricadas", cuerpo)
        self.assertEqual(
            Conversation.objects.get().messages.last().content,
            services.RESPUESTA_FUERA_DE_TEMA,
        )

    def test_conversacion_con_chat_es_del_consejero(self):
        chat_id = self.subir(self.mia).json()["id"]
        self.mia.post(
            "/api/chat/",
            {"message": "¿le intereso?", "analysis_id": chat_id},
            content_type="application/json",
        )
        conversacion = Conversation.objects.get()
        self.assertEqual(conversacion.scope, Conversation.Scope.CONSEJOS)
        self.assertEqual(conversacion.analisis_id, chat_id)


CHAT_IPHONE_MAS = CHAT_IPHONE + """\
[9/22/26, 9:00:00 AM] Tú: buenos días
[9/22/26, 9:05:00 AM] Ana: holaa, ¿cómo dormiste?
"""


@override_settings(ALLOWED_HOSTS=["*"], CONSEJERO_CLAVE_AJUSTES="clave-de-prueba")
class NuevasFuncionesTests(TestCase):
    def setUp(self):
        self.cliente = self.client_class(HTTP_X_FORWARDED_FOR="1.1.1.1")

    def subir(self, datos):
        return self.cliente.post(
            "/api/chat/analyses/",
            {"file": SimpleUploadedFile("chat.txt", datos.encode())},
        )

    def test_subir_otra_vez_el_mismo_chat_solo_agrega_lo_nuevo(self):
        primero = self.subir(CHAT_IPHONE).json()
        segundo = self.subir(CHAT_IPHONE_MAS)
        self.assertEqual(segundo.status_code, 200)
        self.assertTrue(segundo.json()["merged"])
        self.assertEqual(segundo.json()["added"], 2)
        self.assertEqual(AnalisisConversacion.objects.count(), 1)
        chat = AnalisisConversacion.objects.get(id=primero["id"])
        self.assertEqual(chat.total_mensajes, 5)
        # El mensaje de dos líneas no se duplica al comparar.
        self.assertEqual(chat.contenido.count("para mudarme"), 1)

    def test_estadisticas(self):
        chat_id = self.subir(CHAT_IPHONE_MAS).json()["id"]
        datos = self.cliente.get(f"/api/chat/analyses/{chat_id}/stats/").json()
        self.assertEqual(datos["total_messages"], 5)
        ana = next(p for p in datos["participants"] if p["name"] == "Ana")
        self.assertEqual(ana["messages"], 3)
        # Ana contesta a las 10:16 PM un mensaje de las 8:03 PM, y a las 9:05
        # uno de las 9:00: la mediana de las dos respuestas.
        self.assertEqual(ana["median_reply_minutes"], (133.4 + 5) / 2)
        # El sticker de las 10:16 PM se descarta al subir: quedan dos.
        self.assertEqual(datos["hours"][22], 2)

    def test_groserias_por_visitante_y_largo_con_clave(self):
        ajustes = self.cliente.get("/api/chat/settings/").json()
        self.assertEqual(ajustes["profanity"], "sin_filtro")
        self.assertEqual(ajustes["max_chars"], 200)

        self.cliente.put(
            "/api/chat/settings/profanity/",
            {"level": "suave"},
            content_type="application/json",
        )
        self.assertEqual(
            self.cliente.get("/api/chat/settings/").json()["profanity"], "suave"
        )
        # En suave no hay groserías ni en la frase de fuera de tema.
        respuesta = self.cliente.post(
            "/api/chat/", {"message": "hazme la tarea"}, content_type="application/json"
        )
        self.assertNotIn("hijueputa", b"".join(respuesta.streaming_content).decode())

        mala = self.cliente.put(
            "/api/chat/settings/length/",
            {"password": "otra", "max_chars": 900},
            content_type="application/json",
        )
        self.assertEqual(mala.status_code, 403)
        self.assertEqual(
            self.cliente.post(
                "/api/chat/settings/unlock/",
                {"password": "clave-de-prueba"},
                content_type="application/json",
            ).status_code,
            204,
        )
        buena = self.cliente.put(
            "/api/chat/settings/length/",
            {"password": "clave-de-prueba", "max_chars": 900},
            content_type="application/json",
        )
        self.assertEqual(buena.json()["max_chars"], 900)
        self.assertIn("900 caracteres", services.sistema_consejos("normal", 900))


CHAT_ANDROID_LARGO = """\
21/9/26, 20:03 - Julian: hola
21/9/26, 20:05 - Ana: holaa, ¿cómo vas? jaja
21/9/26, 20:06 - Julian: bien, ¿y tú?
21/9/26, 20:10 - Ana: bien! ¿salimos el sábado?
"""


@override_settings(ALLOWED_HOSTS=["*"])
class RelacionYSenalesTests(TestCase):
    def setUp(self):
        self.cliente = self.client_class(HTTP_X_FORWARDED_FOR="1.1.1.1")

    def test_relacion_al_subir_y_quien_soy_si_no_hay_tu(self):
        subido = self.cliente.post(
            "/api/chat/analyses/",
            {
                "file": SimpleUploadedFile("chat.txt", CHAT_ANDROID_LARGO.encode()),
                "relationship": "me_gusta",
            },
        ).json()
        self.assertEqual(subido["relationship"], "me_gusta")
        # El export de Android no trae "Tú": hay que decir quién es uno.
        self.assertTrue(subido["needs_me"])

        cambiado = self.cliente.patch(
            f"/api/chat/analyses/{subido['id']}/",
            {"me": "Julian", "relationship": "pareja"},
            content_type="application/json",
        ).json()
        self.assertFalse(cambiado["needs_me"])
        self.assertEqual(cambiado["relationship"], "pareja")

        datos = self.cliente.get(f"/api/chat/analyses/{subido['id']}/stats/").json()
        interes = datos["interest"]
        self.assertEqual(interes["other"], "Ana")
        self.assertTrue(any("planes" in s for s in interes["for"]))
        self.assertTrue(1 <= interes["score"] <= 10)

    def test_no_se_puede_elegir_a_alguien_que_no_esta(self):
        subido = self.cliente.post(
            "/api/chat/analyses/",
            {"file": SimpleUploadedFile("chat.txt", CHAT_ANDROID_LARGO.encode())},
        ).json()
        respuesta = self.cliente.patch(
            f"/api/chat/analyses/{subido['id']}/",
            {"me": "Pedro"},
            content_type="application/json",
        )
        self.assertEqual(respuesta.status_code, 400)


@override_settings(ALLOWED_HOSTS=["*"])
class PerfilTests(TestCase):
    def setUp(self):
        self.cliente = self.client_class(HTTP_X_FORWARDED_FOR="1.1.1.1")

    def test_contexto_al_importar_y_senal_de_pocos_mensajes(self):
        import json
        from datetime import date, timedelta

        hace_un_anio = (date.today() - timedelta(days=365)).isoformat()
        perfil = {
            "respuestas": [{"pregunta": "¿Ya se conocen en persona?", "respuesta": "Todavía no"}],
            "desde": hace_un_anio,
            "completo": True,
        }
        subido = self.cliente.post(
            "/api/chat/analyses/",
            {
                "file": SimpleUploadedFile("chat.txt", CHAT_IPHONE.encode()),
                "relationship": "me_gusta",
                "profile": json.dumps(perfil),
            },
        ).json()
        self.assertEqual(subido["days_talking"], 365)
        self.assertEqual(subido["profile"]["respuestas"][0]["respuesta"], "Todavía no")

        datos = self.cliente.get(f"/api/chat/analyses/{subido['id']}/stats/").json()
        self.assertTrue(
            any("se escriben muy poco" in s for s in datos["interest"]["against"])
        )
        chat = AnalisisConversacion.objects.get(id=subido["id"])
        self.assertIn("Todavía no", services.chat_como_contexto(chat))

    def test_fecha_en_el_futuro_no(self):
        subido = self.cliente.post(
            "/api/chat/analyses/",
            {"file": SimpleUploadedFile("chat.txt", CHAT_IPHONE.encode())},
        ).json()
        respuesta = self.cliente.patch(
            f"/api/chat/analyses/{subido['id']}/",
            {"profile": {"desde": "2999-01-01"}},
            content_type="application/json",
        )
        self.assertEqual(respuesta.status_code, 400)


@override_settings(ALLOWED_HOSTS=["*"])
class PersonalidadTests(TestCase):
    def test_personalidad_se_guarda_y_llega_a_las_instrucciones(self):
        cliente = self.client_class(HTTP_X_FORWARDED_FOR="1.1.1.1")
        self.assertEqual(cliente.get("/api/chat/settings/").json()["personality"], "consejero")
        cliente.put(
            "/api/chat/settings/personality/",
            {"personality": "abuela"},
            content_type="application/json",
        )
        self.assertEqual(cliente.get("/api/chat/settings/").json()["personality"], "abuela")
        # El nivel de groserías no se toca al cambiar la personalidad.
        self.assertEqual(cliente.get("/api/chat/settings/").json()["profanity"], "sin_filtro")
        self.assertIn("abuela", services.sistema_consejos("sin_filtro", 200, "abuela"))
        self.assertEqual(
            cliente.put(
                "/api/chat/settings/personality/",
                {"personality": "pirata"},
                content_type="application/json",
            ).status_code,
            400,
        )


@override_settings(ALLOWED_HOSTS=["*"], CONSEJERO_CLAVE_AJUSTES="clave-de-prueba")
class OpinionesYSinLimiteTests(TestCase):
    def setUp(self):
        self.mia = self.client_class(HTTP_X_FORWARDED_FOR="1.1.1.1")
        self.otra = self.client_class(HTTP_X_FORWARDED_FOR="2.2.2.2")

    def respuesta(self):
        import json

        # Sin chat, el servidor contesta la frase fija sin llamar al modelo.
        r = self.mia.post("/api/chat/", {"message": "hola"}, content_type="application/json")
        cuerpo = b"".join(r.streaming_content).decode()
        eventos = [json.loads(l[5:]) for l in cuerpo.split("\n") if l.startswith("data:")]
        return next(e for e in eventos if e["type"] == "done")["message_id"]

    def test_te_sirvio_y_estadisticas_con_clave(self):
        mensaje_id = self.respuesta()
        url = f"/api/chat/messages/{mensaje_id}/feedback/"
        # Otra IP no puede valorar respuestas ajenas.
        self.assertEqual(
            self.otra.post(url, {"useful": True}, content_type="application/json").status_code,
            404,
        )
        self.mia.post(url, {"useful": False}, content_type="application/json")
        self.mia.post(url, {"useful": True}, content_type="application/json")

        self.assertEqual(
            self.mia.post(
                "/api/chat/settings/feedback/", {"password": "mala"},
                content_type="application/json",
            ).status_code,
            403,
        )
        stats = self.mia.post(
            "/api/chat/settings/feedback/", {"password": "clave-de-prueba"},
            content_type="application/json",
        ).json()
        # Cambiar de opinión no duplica el voto.
        self.assertEqual((stats["total"], stats["up"]), (1, 1))
        sin_filtro = next(g for g in stats["by_profanity"] if g["key"] == "sin_filtro")
        self.assertEqual(sin_filtro["up"], 1)

        conversacion = self.mia.get("/api/chat/conversations/").json()["results"][0]
        mensajes = self.mia.get(f"/api/chat/conversations/{conversacion['id']}/").json()["messages"]
        self.assertTrue(mensajes[-1]["feedback"])

    def test_ilimitados_con_clave(self):
        from chat.models import ChatQuota

        ChatQuota.objects.create(
            visitor=services.hash_visitante("1.1.1.1"), scope="consejos", used=30
        )
        self.assertEqual(
            self.mia.get("/api/chat/conversations/").json()["advice_quota"]["remaining"], 0
        )
        self.mia.put(
            "/api/chat/settings/unlimited/",
            {"password": "clave-de-prueba", "enabled": True},
            content_type="application/json",
        )
        self.assertIsNone(
            self.mia.get("/api/chat/conversations/").json()["advice_quota"]["limit"]
        )
        self.assertTrue(self.mia.get("/api/chat/settings/").json()["unlimited"])
        # Solo esa conexión.
        self.assertFalse(self.otra.get("/api/chat/settings/").json()["unlimited"])
