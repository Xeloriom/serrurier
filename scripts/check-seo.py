#!/usr/bin/env python3
"""Validate this site's SEO files locally or check the published site."""

import argparse
import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parent.parent
EXPECTED_CANONICAL = "https://xn--serrurierdpannagerapide-kcc.fr/"
EXPECTED_TITLE = "Serrurier à Lyon et alentours | Urgence 24h/24, 7j/7"
EXPECTED_H1_PART = "SERRURIER À LYON"
SITEMAP_NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
DEMO_PATHS = (
    "/home-handyman/",
    "/home-office-repair/",
    "/home-electrician/",
    "/home-carpentry/",
    "/checkout/",
    "/cart/",
    "/wishlist/",
    "/rakar-shop/",
)


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.title = ""
        self.h1 = []
        self.ids = set()
        self.fragments = []
        self.images = []
        self.canonical = None
        self.json_ld = []
        self._text_target = None
        self._in_json_ld = False
        self._json_ld_text = ""

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta":
            key = attrs.get("name") or attrs.get("property")
            if key:
                self.meta[key] = attrs.get("content", "")
        elif tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs.get("href")
        elif tag == "script" and attrs.get("type") == "application/ld+json":
            self._in_json_ld = True
            self._json_ld_text = ""
        elif tag == "title":
            self._text_target = "title"
        elif tag == "h1":
            self.h1.append("")
            self._text_target = "h1"

        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "a" and attrs.get("href", "").startswith("#"):
            self.fragments.append(attrs["href"][1:])
        if tag == "img":
            self.images.append(attrs)

    def handle_data(self, data):
        if self._text_target == "title":
            self.title += data
        elif self._text_target == "h1" and self.h1:
            self.h1[-1] += data
        if self._in_json_ld:
            self._json_ld_text += data

    def handle_endtag(self, tag):
        if tag in ("title", "h1"):
            self._text_target = None
        elif tag == "script" and self._in_json_ld:
            self.json_ld.append(json.loads(self._json_ld_text))
            self._in_json_ld = False


def fail(message):
    print(f"ERREUR: {message}")
    return False


def fetch(url):
    request = Request(url, headers={"User-Agent": "SerrurierSiteSeoCheck/1.0"})
    with urlopen(request, timeout=20) as response:
        return response.geturl(), response.read(), response.headers.get_content_type()


def check_page(html, source, expected_canonical, live=False):
    ok = True
    page = PageParser()
    page.feed(html)

    if not 30 <= len(page.title.strip()) <= 60:
        ok &= fail(f"{source}: titre absent ou longueur hors cible ({len(page.title.strip())}).")
    if not 70 <= len(page.meta.get("description", "")) <= 160:
        ok &= fail(f"{source}: méta-description absente ou longueur hors cible.")
    if page.canonical != expected_canonical:
        ok &= fail(f"{source}: canonical inattendu ({page.canonical!r}).")
    if page.meta.get("og:url") != expected_canonical:
        ok &= fail(f"{source}: og:url ne correspond pas au canonical.")
    if page.meta.get("og:image") != page.meta.get("twitter:image"):
        ok &= fail(f"{source}: images Open Graph et Twitter différentes.")
    if len(page.h1) != 1 or EXPECTED_H1_PART not in " ".join(page.h1).upper():
        ok &= fail(f"{source}: attendu un seul H1 local contenant « Serrurier à Lyon ».")
    if set(page.fragments) - page.ids:
        ok &= fail(f"{source}: ancres internes sans cible: {sorted(set(page.fragments) - page.ids)}.")
    if any("alt" not in image for image in page.images):
        ok &= fail(f"{source}: au moins une image sans attribut alt.")

    for image in page.images:
        image_src = image.get("src", "")
        if image_src and not image_src.startswith(("http://", "https://", "data:")):
            if not (ROOT / image_src).is_file() and not live:
                ok &= fail(f"{source}: image locale introuvable: {image_src}.")

    if not page.json_ld:
        ok &= fail(f"{source}: données structurées JSON-LD absentes.")
    elif not any(
        data.get("@type") == "Locksmith"
        and data.get("telephone") == "+33778952440"
        and data.get("url") == expected_canonical
        for data in page.json_ld
        if isinstance(data, dict)
    ):
        ok &= fail(f"{source}: données Locksmith, téléphone ou URL incohérents.")

    if live and page.title.strip() != EXPECTED_TITLE:
        ok &= fail(f"{source}: titre en ligne différent de la refonte ({page.title.strip()!r}).")
    return ok


def check_local():
    ok = check_page(
        (ROOT / "index.html").read_text(encoding="utf-8"),
        "index.html",
        EXPECTED_CANONICAL,
    )
    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    sitemap_url = EXPECTED_CANONICAL + "sitemap.xml"
    if f"Sitemap: {sitemap_url}" not in robots:
        ok &= fail("robots.txt ne référence pas le sitemap canonique.")

    try:
        root = ElementTree.parse(ROOT / "sitemap.xml").getroot()
        urls = [node.text for node in root.findall(".//s:loc", SITEMAP_NS)]
        if urls != [EXPECTED_CANONICAL]:
            ok &= fail(f"sitemap.xml doit contenir uniquement la page canonique: {urls!r}.")
    except (ElementTree.ParseError, OSError) as error:
        ok &= fail(f"sitemap.xml illisible: {error}.")

    if ok:
        print("OK: HTML, données structurées, robots.txt et sitemap localement cohérents.")
    return ok


def collect_sitemap_urls(url, visited):
    if url in visited or len(visited) >= 20:
        raise ValueError("Index de sitemap en boucle ou contenant trop de sous-sitemaps.")
    visited.add(url)
    final_url, content, content_type = fetch(url)
    if not content_type.endswith("xml"):
        raise ValueError(f"Sitemap non XML ({content_type}): {final_url}")
    root = ElementTree.fromstring(content)
    if root.tag.endswith("sitemapindex"):
        urls = []
        for node in root.findall(".//s:loc", SITEMAP_NS):
            if node.text:
                urls.extend(collect_sitemap_urls(node.text.strip(), visited))
        return urls
    return [
        node.text.strip()
        for node in root.findall(".//s:loc", SITEMAP_NS)
        if node.text
    ]


def check_live(site):
    site = site.rstrip("/") + "/"
    parts = urlsplit(site)
    if parts.scheme != "https" or not parts.netloc or parts.path != "/":
        return fail("--live attend l'URL HTTPS de la racine du site.")

    ok = True
    try:
        page_url, html, content_type = fetch(site)
        if not content_type.startswith("text/html"):
            ok &= fail(f"{page_url}: la page d'accueil n'est pas du HTML ({content_type}).")
        ok &= check_page(
            html.decode("utf-8", "replace"),
            page_url,
            site,
            live=True,
        )
        if page_url != site:
            ok &= fail(f"La racine redirige vers une URL non canonique: {page_url}.")

        _, robots_bytes, _ = fetch(urljoin(site, "robots.txt"))
        robots = robots_bytes.decode("utf-8", "replace")
        sitemap_line = next(
            (line.split(":", 1)[1].strip() for line in robots.splitlines()
             if line.lower().startswith("sitemap:")),
            None,
        )
        if not sitemap_line:
            raise ValueError("robots.txt n'annonce aucun sitemap.")
        sitemap_parts = urlsplit(sitemap_line)
        if sitemap_parts.scheme != "https" or sitemap_parts.netloc != parts.netloc:
            raise ValueError(f"Le sitemap doit être sur le même hôte HTTPS: {sitemap_line}")
        urls = collect_sitemap_urls(sitemap_line, set())
        if site not in urls:
            ok &= fail(f"Le sitemap en ligne ne contient pas la page canonique {site}.")
        unrelated = [url for url in urls if any(path in urlsplit(url).path for path in DEMO_PATHS)]
        if unrelated:
            ok &= fail(f"Le sitemap en ligne contient des pages de démonstration: {unrelated}.")
    except (OSError, ValueError, ElementTree.ParseError, StopIteration) as error:
        ok &= fail(f"Vérification sitemap/robots en ligne impossible: {error}.")

    if ok:
        print(f"OK: version publiée, robots.txt et sitemap accessibles et cohérents pour {site}")
    return ok


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--live",
        metavar="URL",
        help="vérifie également le site publié, robots.txt et les sitemaps annoncés",
    )
    args = parser.parse_args()
    ok = check_local()
    if args.live:
        ok &= check_live(args.live)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
