"""
Pruebas de las descargas que no tocan la red: validacion de la URL, de la
calidad y de los ids de trabajo. Bajar de verdad depende de YouTube y no va en
la suite.
"""

from django.test import SimpleTestCase, override_settings

from descargas import trabajos


@override_settings(ALLOWED_HOSTS=["testserver"])
class DescargasTests(SimpleTestCase):
    def test_rechaza_urls_que_no_son_de_youtube(self):
        for url in ["https://example.com/watch?v=jNQXAC9IVRw", "ftp://youtu.be/x", ""]:
            respuesta = self.client.post(
                "/api/descargas/info/", {"url": url}, content_type="application/json"
            )
            self.assertEqual(respuesta.status_code, 400, url)

    def test_rechaza_una_calidad_fuera_de_la_lista(self):
        respuesta = self.client.post(
            "/api/descargas/trabajos/",
            {"url": "https://youtu.be/jNQXAC9IVRw", "calidad": 999},
            content_type="application/json",
        )
        self.assertEqual(respuesta.status_code, 400)

    def test_saca_el_id_del_video_de_varias_formas_de_enlace(self):
        for url in [
            "https://www.youtube.com/watch?v=jNQXAC9IVRw&list=PL123",
            "https://youtu.be/jNQXAC9IVRw",
            "https://music.youtube.com/watch?v=jNQXAC9IVRw",
        ]:
            self.assertEqual(trabajos.id_video(url), "jNQXAC9IVRw", url)

    def test_un_id_de_trabajo_raro_no_llega_al_disco(self):
        self.assertIsNone(trabajos.estado("../../etc/passwd"))
        respuesta = self.client.get("/api/descargas/trabajos/noexiste/")
        self.assertEqual(respuesta.status_code, 404)
        respuesta = self.client.get("/api/descargas/trabajos/noexiste/archivo/")
        self.assertEqual(respuesta.status_code, 404)

    def test_quita_el_sufijo_topic_del_artista(self):
        self.assertEqual(trabajos._artista({"uploader": "Bad Bunny - Topic"}), "Bad Bunny")
