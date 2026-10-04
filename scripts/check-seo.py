#!/usr/bin/env python3
"""Validate this site's SEO files locally or check the published site."""

import argparse
import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
from urllib.request import Request, urlopen
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parent.parent
EXPECTED_CANONICAL = "https://xn--serrurierdpannagerapide-kcc.fr/"
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
        self.links = []
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
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
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


def route_for_page(path):
    relative = path.parent.relative_to(ROOT)
    if str(relative) == ".":
        return EXPECTED_CANONICAL
    return urljoin(EXPECTED_CANONICAL, relative.as_posix() + "/")


def parse_page(path):
    page = PageParser()
    page.feed(path.read_text(encoding="utf-8"))
    return page


def local_pages():
    excluded_directories = {
        ".git",
        "dist",
        "node_modules",
        "playwright-report",
        "test-results",
        "vendor",
    }
    return sorted(
        path for path in ROOT.rglob("index.html")
        if not excluded_directories.intersection(path.relative_to(ROOT).parts[:-1])
    )


def check_page(html, source, expected_canonical, is_homepage=False, live=False):
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
    if not page.meta.get("og:image:alt") or not page.meta.get("twitter:image:alt"):
        ok &= fail(f"{source}: texte alternatif de l'image sociale absent.")
    if "max-image-preview:large" not in page.meta.get("robots", ""):
        ok &= fail(f"{source}: robots n'autorise pas les grands aperçus d'image.")
    if len(page.h1) != 1 or "LYON" not in " ".join(page.h1).upper():
        ok &= fail(f"{source}: attendu un H1 unique et spécifique à la zone de Lyon.")
    if set(page.fragments) - page.ids:
        ok &= fail(f"{source}: ancres internes sans cible: {sorted(set(page.fragments) - page.ids)}.")
    if any("alt" not in image for image in page.images):
        ok &= fail(f"{source}: au moins une image sans attribut alt.")

    for image in page.images:
        image_src = image.get("src", "")
        if image_src and not image_src.startswith(("http://", "https://", "data:")) and not live:
            image_url = urljoin(expected_canonical, image_src)
            image_path = ROOT / unquote(urlsplit(image_url).path.lstrip("/"))
            if not image_path.is_file():
                ok &= fail(f"{source}: image locale introuvable: {image_src}.")

    social_image = page.meta.get("og:image", "")
    if social_image and not live:
        social_path = ROOT / unquote(urlsplit(social_image).path.lstrip("/"))
        if not social_path.is_file():
            ok &= fail(f"{source}: image Open Graph introuvable: {social_image}.")

    if not page.json_ld:
        ok &= fail(f"{source}: données structurées JSON-LD absentes.")
    elif is_homepage:
        if not any(
            data.get("@type") == "Locksmith"
            and data.get("@id") == expected_canonical + "#business"
            and data.get("telephone") == "+33778952440"
            and data.get("url") == expected_canonical
            for data in page.json_ld
            if isinstance(data, dict)
        ):
            ok &= fail(f"{source}: données Locksmith, téléphone ou URL incohérents.")
    elif not any(
        (
            data.get("@type") == "Service"
            and data.get("url") == expected_canonical
            and data.get("provider", {}).get("@id") == EXPECTED_CANONICAL + "#business"
        )
        or (
            data.get("@type") == "WebPage"
            and data.get("url") == expected_canonical
            and data.get("about", {}).get("@id") == EXPECTED_CANONICAL + "#business"
        )
        for data in page.json_ld
        if isinstance(data, dict)
    ):
        ok &= fail(f"{source}: données Service ou référence au serrurier incohérentes.")

    if not is_homepage and not any(
        data.get("@type") == "BreadcrumbList"
        and [
            item.get("item")
            for item in data.get("itemListElement", [])
            if isinstance(item, dict)
        ] == [EXPECTED_CANONICAL, expected_canonical]
        for data in page.json_ld
        if isinstance(data, dict)
    ):
        ok &= fail(f"{source}: fil d'Ariane JSON-LD absent ou incohérent.")

    if live and not page.meta.get("robots", "index, follow").startswith("index"):
        ok &= fail(f"{source}: page en ligne interdite à l'indexation.")
    return ok


def check_local():
    ok = True
    pages = local_pages()
    known_pages = {}
    titles = set()
    sitemap_urls = []
    for path in pages:
        canonical = route_for_page(path)
        page = parse_page(path)
        known_pages[canonical] = page
        sitemap_urls.append(canonical)
        ok &= check_page(
            path.read_text(encoding="utf-8"),
            path.relative_to(ROOT).as_posix(),
            canonical,
            is_homepage=path.parent == ROOT,
        )
        title = page.title.strip()
        if title in titles:
            ok &= fail(f"{path.relative_to(ROOT)}: titre dupliqué ({title}).")
        titles.add(title)

    for canonical, page in known_pages.items():
        for href in page.links:
            target = urlsplit(urljoin(canonical, href))
            if target.scheme or target.netloc or not target.path:
                continue
            target_path = ROOT / unquote(target.path.lstrip("/"))
            if target.path.endswith("/"):
                target_path /= "index.html"
            if target_path.is_dir():
                target_path /= "index.html"
            target_canonical = urljoin(EXPECTED_CANONICAL, target.path)
            target_page = known_pages.get(target_canonical)
            if not target_path.is_file() or target_page is None:
                ok &= fail(f"{canonical}: lien interne sans page cible ({href}).")
            elif target.fragment and target.fragment not in target_page.ids:
                ok &= fail(f"{canonical}: fragment inexistant pour {href}.")

    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    sitemap_url = EXPECTED_CANONICAL + "sitemap.xml"
    if f"Sitemap: {sitemap_url}" not in robots:
        ok &= fail("robots.txt ne référence pas le sitemap canonique.")

    try:
        root = ElementTree.parse(ROOT / "sitemap.xml").getroot()
        urls = sorted(node.text for node in root.findall(".//s:loc", SITEMAP_NS))
        if urls != sorted(sitemap_urls):
            ok &= fail(
                "sitemap.xml doit répertorier exactement les pages HTML canoniques : "
                f"attendu {sorted(sitemap_urls)!r}, obtenu {urls!r}."
            )
    except (ElementTree.ParseError, OSError) as error:
        ok &= fail(f"sitemap.xml illisible: {error}.")

    llms = ROOT / "llms.txt"
    if not llms.is_file():
        ok &= fail("llms.txt absent.")
    else:
        summary = llms.read_text(encoding="utf-8")
        for canonical in sitemap_urls:
            if canonical not in summary:
                ok &= fail(f"llms.txt ne référence pas la page canonique {canonical}.")
        if "ne garantit pas" not in summary:
            ok &= fail("llms.txt doit préciser qu'il ne garantit pas la visibilité.")

    homepage = known_pages.get(EXPECTED_CANONICAL)
    if homepage and not any(
        data.get("@type") == "WebSite"
        and data.get("@id") == EXPECTED_CANONICAL + "#website"
        and data.get("publisher", {}).get("@id") == EXPECTED_CANONICAL + "#business"
        for data in homepage.json_ld
        if isinstance(data, dict)
    ):
        ok &= fail("index.html: entité WebSite absente ou non reliée à l'entreprise.")

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
        expected_urls = sorted(route_for_page(path) for path in local_pages())
        if sorted(urls) != expected_urls:
            published_only = sorted(set(urls) - set(expected_urls))
            missing = sorted(set(expected_urls) - set(urls))
            ok &= fail(
                "Le sitemap en ligne ne correspond pas aux pages du dépôt "
                f"(URLs non présentes ici : {len(published_only)}, "
                f"pages du dépôt absentes : {len(missing)}). "
                f"Exemples en ligne : {published_only[:5]!r}; "
                f"pages du dépôt à publier : {missing[:5]!r}."
            )
        unrelated = [url for url in urls if any(path in urlsplit(url).path for path in DEMO_PATHS)]
        if unrelated:
            ok &= fail(
                f"Le sitemap en ligne contient {len(unrelated)} URL(s) de démonstration, "
                f"par exemple : {unrelated[:5]!r}."
            )

        for local_path in local_pages():
            canonical = route_for_page(local_path)
            page_url, html, content_type = fetch(canonical)
            if page_url != canonical:
                ok &= fail(f"{canonical}: redirige vers une URL non canonique ({page_url}).")
                continue
            if not content_type.startswith("text/html"):
                ok &= fail(f"{page_url}: la page n'est pas du HTML ({content_type}).")
            ok &= check_page(
                html.decode("utf-8", "replace"),
                page_url,
                canonical,
                is_homepage=local_path.parent == ROOT,
                live=True,
            )
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
