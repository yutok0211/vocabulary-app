"""行儀のよい HTTP 取得: robots.txt 順守・ホストごとの間隔・ディスクキャッシュ。"""
from __future__ import annotations

import hashlib
import logging
import random
import time
from pathlib import Path
from urllib import robotparser
from urllib.parse import urlparse

import requests

log = logging.getLogger(__name__)

DEFAULT_UA = "MapMeshiScraper/0.1 (personal research; python-requests)"


class Blocked(Exception):
    """サイト側に拒否された（403/429 等）。回避はせず、そのサイトの取得を止める。"""


class Fetcher:
    def __init__(self, cache_dir: Path, delay: float = 5.0, user_agent: str = DEFAULT_UA, use_cache: bool = True):
        self.cache_dir = cache_dir
        self.delay = max(delay, 3.0)
        self.use_cache = use_cache
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": user_agent, "Accept-Language": "ja"})
        self._robots: dict[str, robotparser.RobotFileParser] = {}
        self._last: dict[str, float] = {}
        self._crawl_delay: dict[str, float] = {}
        self.blocked_hosts: set[str] = set()

    def allowed(self, url: str) -> bool:
        p = urlparse(url)
        origin = f"{p.scheme}://{p.netloc}"
        if origin not in self._robots:
            rp = robotparser.RobotFileParser()
            try:
                res = self.session.get(origin + "/robots.txt", timeout=15)
                if res.status_code == 200:
                    rp.parse(res.text.splitlines())
                elif 400 <= res.status_code < 500:
                    rp.allow_all = True  # robots.txt が無い
                else:
                    rp.disallow_all = True  # 5xx は「今は来ないで」とみなす
            except requests.RequestException:
                rp.disallow_all = True
            rp.modified()
            self._robots[origin] = rp
            delay = rp.crawl_delay(self.session.headers["User-Agent"])
            if delay:
                log.info("%s: robots.txt の Crawl-delay %ss に従います", p.netloc, delay)
                self._crawl_delay[p.hostname or ""] = float(delay)
        return self._robots[origin].can_fetch(self.session.headers["User-Agent"], url)

    def get(self, url: str) -> str | None:
        """HTML を返す。robots.txt で禁止・取得失敗なら None。拒否されたら Blocked。"""
        host = urlparse(url).hostname or ""
        if host in self.blocked_hosts:
            raise Blocked(host)
        cache = self.cache_dir / host / (hashlib.sha1(url.encode()).hexdigest() + ".html")
        if self.use_cache and cache.exists():
            return cache.read_text(encoding="utf-8")
        if not self.allowed(url):
            log.warning("robots.txt で禁止されているため取得しません: %s", url)
            return None

        self._wait(host)
        try:
            res = self.session.get(url, timeout=30)
        except requests.RequestException as e:
            log.warning("取得失敗 %s: %s", url, e)
            return None
        finally:
            self._last[host] = time.monotonic()

        if res.status_code in (403, 429, 503):
            self.blocked_hosts.add(host)
            raise Blocked(f"{host} が {res.status_code} を返しました。時間をおくか、取得をやめてください。")
        if res.status_code != 200:
            log.warning("HTTP %s: %s", res.status_code, url)
            return None
        res.encoding = res.apparent_encoding if res.encoding in (None, "ISO-8859-1") else res.encoding
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(res.text, encoding="utf-8")
        return res.text

    def _wait(self, host: str) -> None:
        delay = max(self.delay, self._crawl_delay.get(host, 0.0))
        last = self._last.get(host)
        if last is not None:
            remaining = delay + random.uniform(0, delay * 0.3) - (time.monotonic() - last)
            if remaining > 0:
                time.sleep(remaining)
