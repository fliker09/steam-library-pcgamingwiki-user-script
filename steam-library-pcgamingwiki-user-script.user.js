// ==UserScript==
// @name         Steam Library PCGamingWiki DRM Checker
// @namespace    https://github.com/fliker09/steam-library-pcgamingwiki-user-script
// @version      2.0
// @description  Pull DRM status from PCGamingWiki and check if also available on GOG and itch.io
// @author       fliker09
// @license      GPL2
// @supportURL   https://github.com/fliker09/steam-library-pcgamingwiki-user-script/issues
// @icon         https://static.pcgamingwiki.com/favicons/pcgamingwiki.png
// @match        https://steamcommunity.com/id/*/games*
// @grant        GM.xmlHttpRequest
// @connect      pcgamingwiki.com
// @connect      store.steampowered.com
// ==/UserScript==

(async function() {
    'use strict';

    // --- Configuration ---
    const REQUEST_DELAY = 2100; // Delay in milliseconds between API requests
    const CACHE_KEY = 'pcgw_game_cache';

    // --- State ---
    const CACHE = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const QUEUE = [];
    let isProcessing = false;

    // --- Styles ---
    const style = document.createElement('style');
    style.innerHTML = `
    .pcgw-badge-wrapper { position: absolute; top: 0; left: 0; z-index: 10; display: flex; flex-direction: column; padding: 4px; pointer-events: none; }
    .pcgw-badge { background: rgba(0, 0, 0, 0.7); color: #fff; font-size: 9px; padding: 2px 4px; margin-bottom: 2px; border-radius: 2px; text-transform: uppercase; font-weight: bold; pointer-events: auto; text-decoration: none; display: inline-block; }
    .pcgw-badge:hover { background: rgba(0, 0, 0, 0.9); }
    `;
    document.head.appendChild(style);

    // --- Parsing Utils ---
    function depthAwareSplit(str) {
        const parts = [];
        let current = '';
        let depth = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            if (char === '{') depth++;
            else if (char === '}') depth--;
            if (char === '|' && depth === 0) {
                parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current.trim());
        return parts;
    }

    function sanitizeText(text) {
        if (!text) return "None";
        return text
        .replace(/<ref[^>]*?(\/>|>.*?<\/ref>)/gi, '')
        .replace(/\{\{.*?\}\}/g, '')
        .replace(/<\/?[^>]+(>|$)/g, "")
        .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
        .trim();
    }

    function parseWikiText(wikitext) {
        const data = { drm: "None", gog: false, itch: false };
        const rows = wikitext.match(/\{\{Availability\/row\|[\s\S]*?\}\}/gi) || [];

        rows.forEach(row => {
            const inner = row.slice(2, -2);
            const parts = depthAwareSplit(inner);
            const store = parts[1].toLowerCase();

            if (store === 'steam') {
                data.drm = sanitizeText(parts[3] || "None");
            } else if (store === 'gog.com') {
                data.gog = true;
            } else if (store === 'itch.io') {
                data.itch = true;
            }
        });
        return data;
    }

    // --- Core Logic ---
    async function safeFetch(url) {
        return new Promise((resolve) => {
            GM.xmlHttpRequest({
                method: "GET", url: url,
                onload: (res) => resolve(res),
                              onerror: () => resolve({ finalUrl: "", responseText: "" })
            });
        });
    }

    async function processQueue() {
        if (isProcessing || QUEUE.length === 0) return;
        isProcessing = true;
        const { appid, imageContainer } = QUEUE.shift();

        try {
            const res = await safeFetch(`https://www.pcgamingwiki.com/api/appid.php?appid=${appid}`);
            const html = res.responseText || "";
            let gameSlug = null;

            if (html.includes("No such AppID")) {
                CACHE[appid] = { name: "Not Found", drm: "Not Found", gog: null, itch: null };
            }
            else if (html.includes("Multiple pages found")) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const links = doc.querySelectorAll('.content a[href*="/wiki/"]');
                if (links.length > 0) {
                    // Logic updated: use the first entry
                    const firstLink = links[0].href;
                    gameSlug = firstLink.split('/wiki/')[1];
                }
            }
            else if (res.finalUrl && res.finalUrl.includes("/wiki/")) {
                gameSlug = res.finalUrl.split('/wiki/')[1];
            }

            if (gameSlug) {
                const wikiRes = await safeFetch(`https://www.pcgamingwiki.com/w/api.php?action=parse&format=json&prop=wikitext&page=${gameSlug}`);
                try {
                    const wikiData = JSON.parse(wikiRes.responseText);
                    const wikitext = wikiData.parse?.wikitext?.["*"] || "";
                    CACHE[appid] = { name: gameSlug, ...parseWikiText(wikitext) };
                } catch (e) {
                    CACHE[appid] = { name: gameSlug, drm: "Parse Error", gog: false, itch: false };
                }
            } else if (!CACHE[appid]) {
                CACHE[appid] = { name: "Not Found", drm: "Not Found", gog: null, itch: null };
            }

            localStorage.setItem(CACHE_KEY, JSON.stringify(CACHE));
            injectBadges(imageContainer, CACHE[appid]);
        } catch (e) { console.error(e); }

        setTimeout(() => { isProcessing = false; processQueue(); }, REQUEST_DELAY);
    }

    function injectBadges(imageContainer, data) {
        if (imageContainer.querySelector('.pcgw-badge-wrapper')) return;

        imageContainer.style.position = 'relative';
        const div = document.createElement('div');
        div.className = 'pcgw-badge-wrapper';

        const formatStatus = (val) => val === null ? "Unknown" : (val ? "Yes" : "No");

        div.innerHTML = `
        <a class="pcgw-badge" href="https://www.pcgamingwiki.com/wiki/${data.name}" target="_blank">DRM: ${data.drm}</a>
        <span class="pcgw-badge">GOG: ${formatStatus(data.gog)}</span>
        <span class="pcgw-badge">Itch: ${formatStatus(data.itch)}</span>
        `;
        imageContainer.appendChild(div);
    }

    new MutationObserver(() => {
        document.querySelectorAll('a.Focusable[href*="store.steampowered.com/app/"]').forEach(link => {
            const imageContainer = link.querySelector('div') || link;
            if (imageContainer.querySelector('.pcgw-badge-wrapper')) return;

            const appidMatch = link.href.match(/app\/(\d+)/);
            if (appidMatch) {
                const appid = appidMatch[1];
                if (CACHE[appid]) {
                    injectBadges(imageContainer, CACHE[appid]);
                } else if (!QUEUE.find(q => q.appid === appid)) {
                    QUEUE.push({ appid, imageContainer });
                    processQueue();
                }
            }
        });
    }).observe(document.body, { childList: true, subtree: true });
})();
