/* ======================================================
   Vocab AR — script.js
   - GitHub Pages compatible
   - data-text-id="vocabulaire"
   - <div class="text" lang="ar">
   ====================================================== */

(() => {
    "use strict";

    /* ================= CONFIG ================= */
    const JSON_URL = "./vocabAR.json";
    const ENABLE_HOVER = false; // true si tu veux activer le survol (desktop)

    /* ================= UTILS ================= */
    const qs = (s, r = document) => r.querySelector(s);

    function stripPunctuation(str) {
        return (str || "")
            .trim()
            .replace(/^[\s،؛:!?.()\[\]«»"']+|[\s،؛:!?.()\[\]«»"']+$/g, "");
    }

    function normalizeToken(raw, aliases = {}) {
        let t = stripPunctuation(raw);
        if (aliases[t]) t = aliases[t];
        return t.replace(/ـ/g, "");
    }

    function findEntry(dict, token) {
        if (!token) return null;
        if (dict[token]) return { key: token, entry: dict[token] };

        // fallback : retirer "و" initial
        if (token.startsWith("و") && dict[token.slice(1)]) {
            return { key: token.slice(1), entry: dict[token.slice(1)] };
        }
        return null;
    }

    /* ================= POPUP ================= */
    function ensurePopup() {
        let p = qs("#vocab-popup");
        if (p) return p;

        p = document.createElement("div");
        p.id = "vocab-popup";
        p.innerHTML = `
      <div class="vp-card" role="dialog" aria-modal="true">
        <button class="vp-close" aria-label="Fermer">×</button>
        <div class="vp-ar"></div>
        <div class="vp-fr"></div>
        <div class="vp-meta"></div>
        <div class="vp-note"></div>
      </div>
    `;
        document.body.appendChild(p);

        p.addEventListener("click", e => e.target === p && closePopup());
        qs(".vp-close", p).addEventListener("click", closePopup);
        document.addEventListener("keydown", e => e.key === "Escape" && closePopup());

        return p;
    }

    function closePopup() {
        const p = qs("#vocab-popup");
        if (p) p.classList.remove("open");
    }

    function openPopup(word, entry) {
        const p = ensurePopup();
        qs(".vp-ar", p).textContent = word;
        qs(".vp-fr", p).textContent = entry.fr || "";
        qs(".vp-meta", p).textContent =
            [entry.root && `Racine : ${entry.root}`, entry.pos && `Catégorie : ${entry.pos}`]
                .filter(Boolean)
                .join(" • ");
        qs(".vp-note", p).textContent = entry.note ? `Note : ${entry.note}` : "";
        p.classList.add("open");
    }

    /* ================= RENDER ================= */
    function renderText(container, textData) {
        container.innerHTML = "";

        const title = document.createElement("h1");
        title.textContent = textData.title_ar;
        container.appendChild(title);

        textData.phrases.forEach(phrase => {
            const block = document.createElement("div");
            block.className = "phrase";

            const ar = document.createElement("div");
            ar.className = "ar-line";

            phrase.tokens.forEach((tok, i) => {
                const span = document.createElement("span");
                span.textContent = tok.t;
                span.className = tok.clickable ? "w clickable" : "w";

                if (tok.clickable) {
                    span.tabIndex = 0;
                    span.addEventListener("click", () => onTokenClick(textData, tok.t));
                    span.addEventListener("keydown", e => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onTokenClick(textData, tok.t);
                        }
                    });
                    if (ENABLE_HOVER) {
                        span.addEventListener("mouseenter", () => onTokenClick(textData, tok.t));
                    }
                }

                ar.appendChild(span);
                if (i < phrase.tokens.length - 1) {
                    ar.appendChild(document.createTextNode(" "));
                }
            });

            const tr = document.createElement("div");
            tr.className = "tr";
            tr.innerHTML = `
        <div class="fr">✅ ${phrase.fr_fluent}</div>
        <div class="wbw">🔍 ${phrase.fr_word_by_word}</div>
      `;

            block.appendChild(ar);
            block.appendChild(tr);
            container.appendChild(block);
        });
    }

    function onTokenClick(textData, rawToken) {
        const token = normalizeToken(rawToken, textData.aliases || {});
        const found = findEntry(textData.dictionary || {}, token);
        if (found) {
            openPopup(found.key, found.entry);
        } else {
            openPopup(token, { fr: "—", note: "Mot non encore présent dans le vocabulaire." });
        }
    }

    /* ================= STYLES ================= */
    function injectStyles() {
        const css = `
      .text { direction: rtl; line-height: 1.9; }
      .phrase { margin: 16px 0; padding: 12px; border: 1px solid #eee; border-radius: 12px; }
      .ar-line { font-size: 22px; }
      .w { padding: 2px 4px; border-radius: 8px; }
      .clickable { cursor: pointer; background: rgba(0,0,0,0.05); }
      .clickable:hover { background: rgba(0,0,0,0.1); }
      .tr { direction: ltr; font-size: 14px; margin-top: 8px; }

      #vocab-popup { position: fixed; inset: 0; display: none;
        align-items: center; justify-content: center;
        background: rgba(0,0,0,.45); z-index: 9999; }
      #vocab-popup.open { display: flex; }
      .vp-card { background: #fff; padding: 16px; border-radius: 14px;
        max-width: 520px; width: 95vw; position: relative; }
      .vp-close { position: absolute; top: 8px; right: 8px; }
      .vp-ar { direction: rtl; font-size: 26px; font-weight: bold; }
      .vp-fr { font-size: 18px; margin-top: 6px; }
      .vp-meta { font-size: 13px; opacity: .8; margin-top: 4px; }
      .vp-note { font-size: 14px; margin-top: 6px; }
    `;
        const style = document.createElement("style");
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ================= INIT ================= */
    async function init() {
        injectStyles();

        const container = qs(".text[lang='ar']");
        if (!container) return;

        const textId = document.body.dataset.textId;
        if (!textId) {
            container.textContent = "Erreur : data-text-id manquant sur <body>.";
            return;
        }

        try {
            const res = await fetch(JSON_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status} en chargeant ${JSON_URL}`);
            const data = await res.json();
            const textData = data.texts?.[textId];
            if (!textData) {
                container.textContent = `Erreur : vocabulaire "${textId}" introuvable.`;
                return;
            }
            renderText(container, textData);
        } catch (e) {
            container.textContent = "Erreur : impossible de charger vocabAR.json.";
            console.error(e);
        }
    }

    init();
})();
