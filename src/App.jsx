/* ================================================================
   Chocolate Factory — frontend (React). The whole app is in this one file.
   ----------------------------------------------------------------
   How it works, in short:
   - The part after "#" in the address (for example #/produce) decides
     which screen is shown (see ROUTES and renderPage).
   - Every screen is a React component (DashboardPage, ProducePage, ...).
   - All server calls go through api(). It adds the token and the
     language header, and turns server errors into one simple shape.
   - API calls go to "/api/...". In development Vite forwards them to the
     backend (vite.config.js), in Docker nginx does it (nginx.conf).
   ================================================================ */
import { Component, createContext, Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/* ---------- 1. Settings ---------- */

// Where the API is. "/api" works both in development and in Docker.
// Can be changed with VITE_API_BASE in a .env file if ever needed.
const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');

// Factory time zone. "Today" and all shown times use it.
const TZ = 'Asia/Tashkent';

// Ask for confirmation when the operator produces more than this part of the maximum.
const LARGE_QTY_RATIO = 0.8;

/* ---------- Styles (colors and fonts from the UI design) ---------- */
const CSS = `
/* ================================================================
   Chocolate Factory — styles
   Colors and fonts come from the UI design (canvas "Chocolate Factory — UI dizayn").
   ================================================================ */
:root {
  --bg: #F6F1EA;          /* page ground */
  --card: #FFFCF8;        /* cards, inputs */
  --line: #E8DDD1;        /* card border */
  --line2: #F0E7DD;       /* row separator */
  --field: #D9C9B8;       /* input border */
  --chip: #EADFD3;        /* segmented control ground */
  --soft: #F3E8DC;        /* selected row */
  --ink: #22160F;         /* main text */
  --ink2: #4A3A30;        /* secondary text */
  --muted: #6E5A4E;       /* labels */
  --cocoa: #3B2218;       /* primary button */
  --cocoa2: #5A3324;      /* meter "ok" segment, chocolate tile */
  --side: #241510;        /* sidebar */
  --accent: #D4892A;      /* focus, logo */
  --accent2: #E8A64A;     /* active icon, badges */
  --low: #A84A0C;         /* "low stock" warning */
  --low-bg: #FBE9D7;
  --low-ink: #5E2C08;
  --neg: #A3262A;         /* minus moves, errors */
  --neg-bg: #FBE4E2;
  --pos: #2F6B3E;         /* plus moves, ok */
  --pos-bg: #E1EEE3;
  --info-bg: #E0EAF6;
  --info-ink: #1F4A7A;
  --f-head: 'Geologica', system-ui, sans-serif;
  --f-body: 'Onest', system-ui, sans-serif;
  --f-mono: 'JetBrains Mono', ui-monospace, monospace;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--f-body); font-size: 15px; line-height: 1.45; }
body { min-height: 100vh; }
a { color: #7A4A12; }
a:hover { color: #4A2C20; }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; }
h1, h2, h3 { font-family: var(--f-head); margin: 0; letter-spacing: -0.02em; }
h1 { font-size: 34px; line-height: 1.1; font-weight: 700; }
h2 { font-size: 19px; font-weight: 600; letter-spacing: -0.01em; }
h3 { font-size: 15px; font-weight: 600; letter-spacing: 0; }
.mono { font-family: var(--f-mono); }
.muted { color: var(--muted); }
.small { font-size: 13px; }
.xs { font-size: 12px; }
.right { text-align: right; }
.nowrap { white-space: nowrap; }
.hidden { display: none !important; }
.neg { color: var(--neg); }
.pos { color: var(--pos); }
.lowc { color: var(--low); }
.strike { text-decoration: line-through; color: var(--muted); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* ---------- App layout ---------- */
.app { display: flex; min-height: 100vh; }
.side { width: 248px; flex: none; background: var(--side); color: #EADFD3; padding: 24px 16px; display: flex; flex-direction: column; gap: 24px; position: sticky; top: 0; height: 100vh; overflow-y: auto; scrollbar-width: none; }
.side::-webkit-scrollbar { display: none; }
.main { flex: 1; min-width: 0; padding: 32px clamp(16px, 3vw, 44px) 56px; display: flex; flex-direction: column; gap: 22px; }
.brand { display: flex; align-items: center; gap: 12px; padding: 0 8px; text-decoration: none; min-height: 44px; }
.brand b { font-family: var(--f-head); font-weight: 700; font-size: 17px; line-height: 1.15; color: #FFF7EE; }
.logo { width: 40px; height: 40px; flex: none; border-radius: 10px; background: var(--accent); display: grid; grid-template-columns: 1fr 1fr; gap: 3px; padding: 7px; }
.logo i { background: var(--cocoa2); border-radius: 3px; }
.nav { display: flex; flex-direction: column; gap: 2px; }
.nav .sec { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #A8917F; padding: 14px 12px 6px; }
.nav a { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 0 12px; border-radius: 10px; color: #D9CABB; text-decoration: none; font-size: 14px; font-weight: 500; }
.nav a:hover { background: #2E1C15; color: #FFF7EE; }
.nav a.on { background: #3A2419; color: #FFF7EE; font-weight: 600; }
.nav a.on svg { stroke: var(--accent2); }
.nav a span.lbl { flex: 1; min-width: 0; }
.nav .note { font-size: 11px; color: #A8917F; }
.nav .badge { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; background: var(--accent2); color: var(--side); font-size: 11px; font-weight: 700; display: grid; place-items: center; }
.side-foot { margin-top: auto; display: flex; flex-direction: column; gap: 14px; }
.langsw { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: #33201A; border-radius: 10px; padding: 4px; }
.langsw button { min-height: 40px; border: 0; border-radius: 7px; font-weight: 600; font-size: 13px; background: transparent; color: #D9CABB; }
.langsw button[aria-pressed="true"] { background: #EADFD3; color: var(--side); }
.me { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 12px; background: #2E1C15; }
.ava { width: 36px; height: 36px; flex: none; border-radius: 50%; background: #6B4A3A; color: #FFF7EE; display: grid; place-items: center; font-size: 13px; font-weight: 600; }
.me .who { min-width: 0; flex: 1; }
.me .who b { display: block; font-size: 13px; color: #FFF7EE; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.me .who span { display: block; font-size: 12px; color: #B8A291; }
.me button { width: 44px; height: 44px; flex: none; display: grid; place-items: center; border-radius: 10px; color: #CDBBAA; background: transparent; border: 0; }
.me button:hover { background: #3A2419; }
.topbar { display: none; }
.scrim { display: none; }

@media (max-width: 960px) {
  .app { flex-direction: column; }
  .topbar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: var(--side); color: #FFF7EE; position: sticky; top: 0; z-index: 30; }
  .topbar .brand { padding: 0; }
  .topbar button { margin-left: auto; width: 44px; height: 44px; border-radius: 10px; border: 0; background: #33201A; color: #FFF7EE; display: grid; place-items: center; }
  .side { position: fixed; left: 0; top: 0; bottom: 0; z-index: 50; transform: translateX(-100%); transition: transform .2s; height: 100%; }
  .app.menu-open .side { transform: none; }
  .app.menu-open .scrim { display: block; position: fixed; inset: 0; background: rgba(36, 21, 16, .45); z-index: 40; }
  .main { padding: 20px 16px 48px; }
  h1 { font-size: 28px; }
}

/* ---------- Building blocks ---------- */
.page-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px; }
.page-head p { margin: 6px 0 0; color: var(--muted); font-size: 15px; }
.page-head .pre { margin: 0 0 4px; font-size: 14px; color: var(--muted); }
.actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 20px; padding: 22px 24px; }
.card-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px 16px; margin-bottom: 12px; }
.card-head a { font-size: 14px; font-weight: 600; }
.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr)); gap: 20px; align-items: start; }
.grid-side { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(min(340px, 100%), 1fr); gap: 20px; align-items: start; }
@media (max-width: 1100px) { .grid-side { grid-template-columns: minmax(0, 1fr); } }
.stack { display: flex; flex-direction: column; gap: 16px; }
.row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 18px; border-radius: 12px; border: 1px solid var(--field); background: var(--card); color: var(--ink); text-decoration: none; font-weight: 600; font-size: 14px; white-space: nowrap; }
.btn:hover { background: #FFF7EE; color: var(--ink); }
.btn.primary { background: var(--cocoa); border-color: var(--cocoa); color: #FFF7EE; }
.btn.primary:hover { background: #4A2C20; color: #FFF7EE; }
.btn.primary svg { stroke: var(--accent2); }
.btn.danger { background: var(--neg); border-color: var(--neg); color: #FFF; }
.btn.danger:hover { background: #8A1F23; color: #FFF; }
.btn.ghost { border-color: transparent; background: transparent; }
.btn.ghost:hover { background: var(--chip); }
.btn.big { min-height: 56px; font-size: 16px; border-radius: 14px; width: 100%; }
.btn.sm { min-height: 36px; padding: 0 12px; font-size: 13px; border-radius: 10px; }
.btn:disabled, .btn[aria-disabled="true"] { background: #E8DDD1; border-color: #E8DDD1; color: #6E5A4E; }
.btn:disabled svg { stroke: currentColor; }
.icon-btn { width: 44px; height: 44px; display: inline-grid; place-items: center; border-radius: 10px; border: 1px solid var(--field); background: var(--card); color: var(--ink); }
.icon-btn:hover { background: #FFF7EE; }
.icon-btn.ghost { border-color: transparent; background: transparent; }
.link-btn { border: 0; background: none; padding: 0; color: #7A4A12; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; min-height: 32px; }

.seg { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--chip); flex-wrap: wrap; }
.seg button { min-height: 40px; padding: 0 16px; border: 0; border-radius: 9px; background: transparent; font-weight: 500; font-size: 14px; color: var(--ink2); }
.seg button[aria-pressed="true"] { background: var(--card); color: var(--ink); font-weight: 600; box-shadow: 0 1px 2px rgba(34, 22, 15, .08); }
.seg.sm button { min-height: 34px; padding: 0 12px; font-size: 13px; }

.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field > label, .field > .lbl, fieldset > legend { font-size: 14px; font-weight: 600; }
.field .opt { font-weight: 400; color: var(--muted); }
.field .req { color: var(--neg); }
.field .help { font-size: 12px; color: var(--muted); }
.field .err { font-size: 13px; color: var(--neg); font-weight: 600; margin: 0; display: flex; gap: 6px; align-items: center; }
fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
.input, select.input, textarea.input { min-height: 48px; width: 100%; border-radius: 12px; border: 1px solid var(--field); background: var(--card); padding: 0 14px; font-size: 15px; }
textarea.input { padding: 12px 14px; min-height: 64px; resize: vertical; }
select.input { padding-right: 34px; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236E5A4E' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
.input[aria-invalid="true"] { border-color: var(--neg); border-width: 2px; }
.input:disabled { background: #F3ECE3; color: var(--muted); }
.input.mono { font-family: var(--f-mono); }
.unit-wrap { display: flex; gap: 8px; align-items: stretch; }
.unit-wrap .input { flex: 1; min-width: 0; }
.unit-tag { display: grid; place-items: center; padding: 0 14px; border-radius: 12px; background: var(--chip); font-weight: 600; font-size: 14px; color: var(--ink2); }
.search { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--field); background: var(--card); flex: 1 1 220px; }
.search input { flex: 1; min-width: 0; border: 0; background: transparent; outline: none; font-size: 14px; }
.check { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--field); background: var(--card); font-size: 14px; font-weight: 500; cursor: pointer; }
.check input, .cb { width: 20px; height: 20px; accent-color: var(--cocoa); }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 16px 20px; }

/* Alerts / banners */
.alert { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; padding: 14px 18px; border-radius: 14px; font-size: 14px; line-height: 1.45; }
.alert > svg { flex: none; }
.alert .txt { flex: 1 1 300px; }
.alert strong { display: block; }
.alert.inline strong { display: inline; }
.alert.warn { background: var(--low-bg); color: var(--low-ink); }
.alert.warn a { color: var(--low-ink); font-weight: 600; }
.alert.err { background: var(--neg-bg); color: #6E1418; }
.alert.ok { background: var(--pos-bg); color: #1E4A2A; }
.alert.info { background: var(--info-bg); color: #163A60; }

/* KPI tiles */
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr)); gap: 16px; }
.kpi { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 20px; display: flex; flex-direction: column; gap: 6px; }
.kpi .k-l { font-size: 13px; color: var(--muted); font-weight: 500; }
.kpi .k-v { font-family: var(--f-mono); font-size: 32px; font-weight: 600; letter-spacing: -0.03em; line-height: 1.1; }
.kpi .k-v span { font-size: 15px; color: var(--muted); font-weight: 500; letter-spacing: 0; }
.kpi .k-s { font-size: 12px; color: var(--muted); }

/* Chocolate bar meter: 20 segments, black line = minimum */
.meter { position: relative; height: 22px; display: flex; align-items: center; min-width: 90px; }
.meter .segs { display: flex; gap: 3px; width: 100%; height: 16px; }
.meter .segs i { flex: 1 1 0; min-width: 2px; border-radius: 3px; background: #EFE5DA; }
.meter .segs i.ok { background: var(--cocoa2); box-shadow: inset 0 -3px 0 rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.14); }
.meter .segs i.low { background: #C9701E; box-shadow: inset 0 -3px 0 rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.2); }
.meter .segs i.out { background: transparent; border: 1.5px dashed #B4530E; }
.meter .min { position: absolute; top: 0; bottom: 0; width: 2px; border-radius: 1px; background: var(--ink); }

/* Tables built with CSS grid */
.tbl { width: 100%; }
.tbl .th { display: grid; gap: 16px; padding: 12px 0; font-size: 12px; font-weight: 600; color: var(--muted); }
.tbl .tr { display: grid; gap: 16px; align-items: center; min-height: 56px; padding: 8px 0; border-top: 1px solid var(--line2); }
.tbl .sec { font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); padding: 14px 0 8px; border-top: 1px solid var(--line2); }
.name b { display: block; font-weight: 600; font-size: 14px; }
.name span { display: block; font-family: var(--f-mono); font-size: 11px; color: var(--muted); }
.scroll-x { overflow-x: auto; }
.scroll-x > .tbl { min-width: 720px; }
.lowtag { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: var(--low); }
.outtag { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: var(--neg); }

/* Doc type badges */
.badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.b-production { background: #EDE3F5; color: #4F2C73; }
.b-receipt { background: #E1EEE3; color: #245533; }
.b-reversal { background: #F1E4DA; color: #6B3A1E; }
.b-adjustment { background: #E0EAF6; color: #1F4A7A; }
.b-scrap { background: #F8E0DF; color: #8A1F23; }
.b-raw { background: #F1E4DA; color: #6B3A1E; }
.b-finished { background: #EDE3F5; color: #4F2C73; }
.b-ok { background: var(--pos-bg); color: #245533; }
.b-off { background: #EFE5DA; color: var(--ink2); }
.b-warn { background: var(--low-bg); color: var(--low-ink); }
.b-err { background: var(--neg-bg); color: #8A1F23; }

/* Document list rows */
.doc-row { display: grid; grid-template-columns: 92px minmax(0, 1fr) auto auto; gap: 14px; align-items: center; padding: 12px 8px; border-top: 1px solid var(--line2); text-decoration: none; color: inherit; border-radius: 10px; }
.doc-row:hover { background: #FBF5EE; }
.doc-row .code { font-family: var(--f-mono); font-weight: 600; font-size: 13px; }
.doc-row .sum { font-size: 13px; color: var(--ink2); display: block; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 640px) { .doc-row { grid-template-columns: 1fr auto; } .doc-row .who { display: none; } }

/* Modal and drawer */
.overlay { position: fixed; inset: 0; background: rgba(36, 21, 16, .5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; animation: fade .15s; }
.modal { background: var(--card); border-radius: 22px; width: min(520px, 100%); max-height: calc(100vh - 32px); overflow-y: auto; padding: 28px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 30px 80px rgba(0,0,0,.3); }
.modal h2 { font-size: 22px; }
.modal p { margin: 0; color: var(--ink2); }
.modal .foot { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; margin-top: 4px; }
.overlay.at-side { justify-content: flex-end; padding: 0; align-items: stretch; }
.drawer { background: var(--card); width: min(480px, 100%); height: 100%; overflow-y: auto; padding: 24px 26px 32px; display: flex; flex-direction: column; gap: 18px; box-shadow: -20px 0 60px rgba(0,0,0,.2); animation: slide .18s; }
.drawer-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.drawer-head h2 { font-size: 26px; font-family: var(--f-mono); letter-spacing: -0.02em; }
.drawer dl { display: grid; grid-template-columns: max-content 1fr; gap: 8px 16px; margin: 0; font-size: 14px; }
.drawer dt { color: var(--muted); }
.drawer dd { margin: 0; font-weight: 500; overflow-wrap: anywhere; }
@keyframes fade { from { opacity: 0; } }
@keyframes slide { from { transform: translateX(40px); opacity: .5; } }

.moves { display: flex; flex-direction: column; gap: 2px; background: var(--bg); border-radius: 14px; padding: 8px 14px; }
.moves .mv { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; font-size: 14px; border-top: 1px solid var(--line); }
.moves .mv:first-child { border-top: 0; }
.moves .mv b { font-family: var(--f-mono); font-weight: 600; white-space: nowrap; }
.moves .mv .after { font-family: var(--f-mono); color: var(--muted); font-size: 12px; white-space: nowrap; }

/* Toasts */
.toasts { position: fixed; right: 20px; bottom: 20px; z-index: 200; display: flex; flex-direction: column; gap: 10px; max-width: min(420px, calc(100vw - 40px)); }
.toast { background: var(--side); color: #FFF7EE; border-radius: 14px; padding: 14px 16px; font-size: 14px; box-shadow: 0 12px 40px rgba(0,0,0,.25); display: flex; gap: 10px; align-items: flex-start; animation: fade .2s; }
.toast.err { background: #6E1418; }
.toast a { color: var(--accent2); font-weight: 600; }

/* Spinner and loading */
.spin { width: 18px; height: 18px; border-radius: 50%; border: 2.5px solid rgba(255,247,238,.35); border-top-color: #FFF7EE; animation: rot .8s linear infinite; flex: none; }
.spin.dark { border-color: rgba(59,34,24,.2); border-top-color: var(--cocoa); }
@keyframes rot { to { transform: rotate(360deg); } }
.loading { display: flex; align-items: center; gap: 12px; padding: 40px; justify-content: center; color: var(--muted); }
.skel { background: linear-gradient(90deg, #EFE5DA 25%, #F6EEE5 50%, #EFE5DA 75%); background-size: 200% 100%; animation: sk 1.2s infinite; border-radius: 10px; }
@keyframes sk { to { background-position: -200% 0; } }

/* Empty states */
.empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 40px 20px; }
.empty h2 { font-size: 20px; }
.empty p { margin: 0; color: var(--muted); max-width: 420px; }
.tile-art { display: grid; grid-template-columns: repeat(2, 28px); gap: 4px; padding: 8px; border-radius: 10px; background: #EFE5DA; margin-bottom: 6px; }
.tile-art i { height: 20px; border-radius: 5px; background: var(--cocoa2); box-shadow: inset 0 -4px 0 rgba(0,0,0,.25); }
.tile-art i.gap { background: transparent; border: 2px dashed var(--accent); box-shadow: none; }

/* Pager */
.pager { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-top: 14px; border-top: 1px solid var(--line2); font-size: 13px; color: var(--muted); flex-wrap: wrap; }
.pager .row { gap: 6px; }

/* ---------- Login / password screens ---------- */
.auth { display: flex; flex-wrap: wrap; min-height: 100vh; }
.auth-art { flex: 1 1 460px; background: var(--side); color: #EADFD3; padding: clamp(28px, 5vw, 64px); display: flex; flex-direction: column; justify-content: space-between; gap: 40px; overflow: hidden; }
.auth-art .bar { align-self: center; width: min(100%, 420px); aspect-ratio: 3 / 2; background: #3B2218; border-radius: 18px; padding: 14px; display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; transform: rotate(-6deg); box-shadow: 0 30px 60px rgba(0,0,0,.35); }
.auth-art .bar i { background: var(--cocoa2); border-radius: 6px; box-shadow: inset 0 -5px 0 rgba(0,0,0,.28), inset 0 2px 0 rgba(255,255,255,.1); }
.auth-art .bar i.gap { background: transparent; border: 2px dashed var(--accent); box-shadow: none; }
.auth-art .tag { font-family: var(--f-head); font-size: clamp(26px, 3.2vw, 40px); line-height: 1.15; font-weight: 700; color: #FFF7EE; letter-spacing: -0.02em; max-width: 460px; }
.auth-form { flex: 1 1 460px; padding: clamp(24px, 5vw, 64px); display: flex; flex-direction: column; }
.auth-form .seg { align-self: flex-end; }
.auth-form form { margin: auto 0; width: 100%; max-width: 400px; align-self: center; display: flex; flex-direction: column; gap: 18px; padding: 32px 0; }
.auth-form form p { margin: 0; }
.reqs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.reqs li { display: flex; gap: 8px; align-items: center; color: var(--muted); }
.reqs li.ok { color: var(--pos); }
@media (max-width: 760px) { .auth-art { flex-basis: 100%; min-height: auto; padding: 24px; } .auth-art .bar, .auth-art .tag { display: none; } }

/* ---------- Produce screen ---------- */
.step-n { font-family: var(--f-mono); color: var(--accent); font-weight: 600; }
.prod-pick { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 10px; }
.prod-pick button { display: flex; align-items: center; gap: 14px; text-align: left; min-height: 76px; padding: 14px 16px; border-radius: 16px; border: 1.5px solid var(--line); background: var(--card); }
.prod-pick button[aria-pressed="true"] { border: 2px solid var(--cocoa); background: #FBF5EE; box-shadow: 0 0 0 4px rgba(212,137,42,.18); }
.prod-pick .sw { width: 34px; height: 34px; border-radius: 9px; flex: none; background: var(--cocoa2); box-shadow: inset 0 -5px 0 rgba(0,0,0,.25); }
.prod-pick b { display: block; font-size: 15px; }
.prod-pick small { display: block; font-size: 12px; color: var(--muted); }
.qty-box { display: flex; gap: 10px; align-items: stretch; margin-top: 10px; }
.qty-box .input { text-align: center; font-family: var(--f-mono); font-size: 28px; font-weight: 600; min-height: 64px; border: 2px solid var(--cocoa); border-radius: 14px; }
.qty-box .input[aria-invalid="true"] { border-color: var(--neg); }
.qty-box .icon-btn { width: 64px; height: auto; border-radius: 14px; }
.quick { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.quick button { min-height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--field); background: var(--card); font-weight: 600; font-size: 14px; font-family: var(--f-mono); }
.quick button:hover { background: #FFF7EE; }
.need-line { padding: 14px 0; border-top: 1px solid var(--line2); display: flex; flex-direction: column; gap: 8px; }
.need-line:first-of-type { border-top: 0; }
.need-line .top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 14px; font-size: 14px; }
.need-line .top b { font-variant-numeric: tabular-nums; }
.need-bar { height: 10px; background: #EFE5DA; border-radius: 5px; overflow: hidden; display: flex; }
.need-bar i { display: block; height: 100%; }
.need-bar i.use { background: var(--cocoa2); }
.need-bar i.short { background: var(--neg); }
.need-line .st { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.result-box { background: var(--side); color: #EADFD3; border-radius: 20px; padding: 22px 24px; display: flex; flex-direction: column; gap: 14px; }
.result-box .mvs { display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
.result-box .mvs div { display: flex; justify-content: space-between; gap: 12px; }
.result-box .mvs b { font-family: var(--f-mono); }
.result-box .btn.big:not(:disabled) { background: var(--accent2); border-color: var(--accent2); color: var(--side); }
.result-box .btn.big:not(:disabled):hover { background: #F0B562; }
.result-box .btn.big:not(:disabled) svg { stroke: var(--side); }
.result-box .btn.big:disabled { background: #3A2419; border-color: #3A2419; color: #CDBBAA; }
.result-box .btn.big .spin { border-color: rgba(36,21,16,.25); border-top-color: var(--side); }
.result-box .alt { display: flex; gap: 10px; flex-wrap: wrap; }
.result-box .alt .btn { flex: 1; background: transparent; color: #FFF7EE; border-color: #6B4A3A; }
.done-bar { display: grid; grid-template-columns: repeat(4, 34px); gap: 5px; padding: 8px; background: #3B2218; border-radius: 12px; align-self: center; }
.done-bar span { height: 24px; border-radius: 5px; background: var(--cocoa2); box-shadow: inset 0 -4px 0 rgba(0,0,0,.28); }
.done-bar span.new { background: var(--accent2); animation: pop .5s ease-out; }
@keyframes pop { from { transform: scale(.2); opacity: 0; } 60% { transform: scale(1.15); } }

/* ---------- Chart ---------- */
.chart { display: grid; grid-template-columns: 34px 1fr; gap: 8px; }
.chart .yax { display: flex; flex-direction: column; justify-content: space-between; font-family: var(--f-mono); font-size: 11px; color: var(--muted); text-align: right; height: 180px; }
.chart .plot { position: relative; height: 180px; border-bottom: 1px solid var(--field); display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 10px; align-items: end; }
.chart .plot .gl { position: absolute; left: 0; right: 0; border-top: 1px dashed var(--line); }
.chart .col { display: flex; flex-direction: column-reverse; align-items: stretch; height: 100%; justify-content: flex-start; position: relative; z-index: 1; }
.chart .col i { display: block; width: min(44px, 100%); margin: 0 auto; }
.chart .col i:last-child { border-radius: 4px 4px 0 0; }
.chart .xax { grid-column: 2; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 10px; text-align: center; font-size: 12px; color: var(--muted); padding-top: 6px; }
.chart .xax b { display: block; font-weight: 600; color: var(--ink2); font-size: 12px; }
.legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; color: var(--ink2); }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.legend i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
details.tv summary { cursor: pointer; font-size: 13px; font-weight: 600; color: #7A4A12; margin-top: 12px; min-height: 32px; display: inline-flex; align-items: center; }
.mini-tbl { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 6px; }
.mini-tbl th, .mini-tbl td { text-align: left; padding: 6px 8px; border-top: 1px solid var(--line2); }
.mini-tbl th { color: var(--muted); font-weight: 600; font-size: 12px; }
.mini-tbl td.n, .mini-tbl th.n { text-align: right; font-family: var(--f-mono); }

/* Capacity cards */
.cap { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-top: 1px solid var(--line2); }
.cap:first-of-type { border-top: 0; }
.cap .sw { width: 14px; height: 40px; border-radius: 4px; flex: none; }
.cap .nm { flex: 1; min-width: 0; }
.cap .nm b { display: block; font-size: 15px; }
.cap .nm span { font-size: 13px; color: var(--muted); }
.cap .mx { text-align: right; }
.cap .mx small { display: block; font-size: 12px; color: var(--muted); }
.cap .mx b { font-family: var(--f-mono); font-size: 26px; font-weight: 600; }
.cap .mx b span { font-size: 13px; color: var(--muted); font-weight: 500; }

/* Recipes */
.rc-layout { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 20px; align-items: start; }
@media (max-width: 1000px) { .rc-layout { grid-template-columns: minmax(0, 1fr); } }
.rc-nav { display: flex; flex-direction: column; gap: 6px; }
.rc-nav button { display: flex; align-items: center; gap: 12px; text-align: left; min-height: 60px; padding: 10px 14px; border-radius: 14px; border: 1px solid var(--line); background: var(--card); }
.rc-nav button[aria-current="true"] { border: 2px solid var(--cocoa); background: #FBF5EE; }
.rc-nav b { display: block; font-size: 14px; }
.rc-nav small { display: block; font-size: 12px; color: var(--muted); }
.vers { list-style: none; margin: 0; padding: 0; display: flex; gap: 8px; flex-wrap: wrap; }
.vers li button { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-width: 120px; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--card); text-align: left; }
.vers li button[aria-current="true"] { border: 2px solid var(--cocoa); }
.vers li b { font-family: var(--f-mono); font-size: 15px; }
.vers li small { font-size: 12px; color: var(--muted); }
.rl { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(110px, 0.8fr) minmax(90px, 0.8fr) 44px; gap: 12px; align-items: center; padding: 8px 0; border-top: 1px solid var(--line2); }

/* Print */
.print-page { background: #FFF; color: #000; max-width: 794px; margin: 0 auto; padding: 48px 56px; font-size: 13px; }
.print-page h1 { font-size: 22px; letter-spacing: 0; }
.print-page table { width: 100%; border-collapse: collapse; margin: 16px 0; }
.print-page th, .print-page td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
.print-page td.n, .print-page th.n { text-align: right; font-family: var(--f-mono); white-space: nowrap; }
.print-page .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; }
.print-page .sign div { border-top: 1px solid #000; padding-top: 6px; font-size: 12px; }
.print-bar { display: flex; gap: 10px; justify-content: center; padding: 16px; }
@media print {
  .no-print, .side, .topbar, .toasts { display: none !important; }
  body, html { background: #FFF; }
  .main { padding: 0; }
  .print-page { padding: 0; max-width: none; }
}

/* Errors */
.err-page { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 14px; min-height: 60vh; }
.err-page .code { font-family: var(--f-mono); font-size: 72px; font-weight: 600; color: var(--cocoa2); letter-spacing: -0.04em; line-height: 1; }
.err-page p { max-width: 460px; color: var(--ink2); margin: 0; }

/* ---------- Phone layout ----------
   Tables become small cards: header row is hidden, every row is a 2-column grid.
   Classes used in App.jsx:
   m-full = cell takes the whole row, m-hide = hidden on phone, m-o1..m-o7 = order,
   m-sub = small grey text, m-lbl = shows its data-label before the value, m-only = shown only on phone. */
.m-only { display: none; }
@media (max-width: 720px) {
  .app { overflow-x: clip; }
  /* 16px text in fields: iPhone does not zoom in when a field is tapped */
  .input, select.input, textarea.input, .search input, .qty-box .input { font-size: 16px; }
  .qty-box .input { font-size: 26px; }
  .card { padding: 16px; border-radius: 16px; }
  .main { gap: 16px; }
  .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .kpi { padding: 14px; border-radius: 14px; }
  .kpi .k-v { font-size: 24px; }
  .page-head .actions { width: 100%; }
  .page-head .actions > .btn, .page-head .actions > a.btn { flex: 1 1 auto; }
  .seg:not(.sm) { display: flex; width: 100%; }
  .seg:not(.sm) button { flex: 1 1 0; padding: 0 8px; font-size: 13px; }
  .auth-form .seg:not(.sm) { width: auto; }
  .filters-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .filters-grid .f-wide { grid-column: 1 / -1; }

  .scroll-x { overflow-x: visible; }
  .scroll-x > .tbl, .tbl { min-width: 0 !important; }
  .tbl .th, .rl.th { display: none; }
  .tbl .tr, .rl, .hist-row { grid-template-columns: minmax(0, 1fr) auto !important; grid-auto-flow: row dense; gap: 6px 12px !important; padding: 12px 0; min-height: 0; }
  .tbl .tr > *, .rl > *, .hist-row > * { min-width: 0; }
  .m-full { grid-column: 1 / -1; }
  .m-hide { display: none !important; }
  .m-only { display: block; }
  .m-o1 { order: 1; } .m-o2 { order: 2; } .m-o3 { order: 3; } .m-o4 { order: 4; } .m-o5 { order: 5; } .m-o6 { order: 6; } .m-o7 { order: 7; }
  .m-sub { font-size: 12px !important; color: var(--muted); }
  .m-lbl::before { content: attr(data-label) ': '; color: var(--muted); font-family: var(--f-body); font-weight: 400; }
  .m-right { text-align: right; justify-self: end; }
  .exp-moves { margin-left: 0 !important; }
  .doc-row { padding: 12px 4px; }
}
`;

/* ---------- 2. Texts in two languages ---------- */

const T = {
  uz: {
    appName: 'Chocolate Factory',
    // roles
    role_admin: 'Administrator', role_warehouse: 'Omborchi', role_operator: 'Ishlab chiqarish operatori',
    // menu
    menu: 'Asosiy menyu', sProd: 'Ishlab chiqarish', sStock: 'Ombor', sCat: 'Katalog', sSys: 'Tizim',
    nav_dashboard: 'Boshqaruv paneli', nav_wh: 'Ombor paneli', nav_produce: 'Ishlab chiqarish', nav_stock: 'Qoldiqlar',
    nav_receipt: 'Kirim', nav_adjust: 'Tuzatish', nav_scrap: 'Brak', nav_ledger: 'Harakatlar jurnali',
    nav_products: 'Mahsulotlar', nav_recipes: 'Retseptlar', nav_users: 'Foydalanuvchilar', nav_mydocs: 'Mening hujjatlarim',
    view: 'koʻrish', logout: 'Chiqish', openMenu: 'Menyuni ochish', closeMenu: 'Menyuni yopish', lang: 'Til',
    lowBadge: '{n} ta xomashyo kam qolgan',
    // units
    g: 'g', kg: 'kg', pcs: 'dona', day: 'kun',
    // common
    save: 'Saqlash', cancel: 'Bekor qilish', close: 'Yopish', edit: 'Tahrirlash', all: 'Barchasi', search: 'Qidirish',
    loading: 'Yuklanmoqda…', retry: 'Qayta urinish', yes: 'Ha', optional: '(ixtiyoriy)', required: 'majburiy',
    raw: 'Xomashyo', finished: 'Tayyor mahsulot', product: 'Mahsulot', qty: 'Miqdor', note: 'Izoh', reason: 'Sabab',
    choose: 'Tanlang…', sending: 'Yuborilmoqda…', saving: 'Saqlanmoqda…', min: 'min', minimum: 'Minimum',
    stockNow: 'Qoldiq', print: 'Chop etish', openDoc: 'Hujjatni ochish', autoNumber: 'raqam avtomatik beriladi',
    prev: 'Oldingi sahifa', next: 'Keyingi sahifa', shown: '{a}–{b} / {n}', none: '—',
    low: 'Kam', out: 'Tugagan', days: '{n} kun', reasonRequired: 'Sabab majburiy',
    noteRequiredOther: '«Boshqa» tanlansa, izoh majburiy',
    // errors
    netErr: 'Server bilan aloqa yoʻq. Hech narsa oʻzgarmadi — qayta urinib koʻring.',
    sessionEnded: 'Sessiya tugadi. Qaytadan kiring.',
    // login
    tagline: 'Kakaodan plitkagacha — har bir gramm hisobda.',
    loginTitle: 'Tizimga kirish', loginSub: 'Ishni boshlash uchun hisobingizga kiring.',
    login: 'Login', password: 'Parol', remember: 'Meni eslab qol', enter: 'Kirish',
    loginHelp: 'Parolni unutdingizmi? Administratorga murojaat qiling.',
    // password change
    pcTitle: 'Yangi parol oʻrnating', pcSub: 'Salom, {name}. Administrator sizga vaqtinchalik parol bergan. Davom etish uchun oʻzingizning parolingizni oʻrnating.',
    pcCurrent: 'Vaqtinchalik parol', pcNew: 'Yangi parol', pcRepeat: 'Yangi parolni takrorlang',
    pcR1: 'Kamida 8 belgi', pcR2: 'Harf va raqam bor', pcR3: 'Vaqtinchalik paroldan farq qiladi', pcMismatch: 'Parollar mos kelmadi',
    pcSave: 'Saqlash va davom etish', pcSkip: 'Bu bosqichni oʻtkazib boʻlmaydi.', pcDone: 'Parol yangilandi',
    // dashboard
    dashTitle: 'Boshqaruv paneli', whTitle: 'Ombor paneli', btnReceipt: 'Kirim qilish', btnProduce: 'Ishlab chiqarish', btnAdjust: 'Tuzatish',
    alertLow1: '{name} minimal qoldiqdan past:', alertLow1t: '{qty} qoldi (minimum {min}).', alertLowDays: ' Taxminan {d} kunga yetadi.',
    alertLowMany: '{n} ta pozitsiya minimal qoldiqdan past:', alertOut: '{name} tugagan.',
    k1: 'Bugun ishlab chiqarildi', k2: 'Kam qolgan xomashyo', k3: 'Bugungi hujjatlar', k4: '7 kunda ishlab chiqarildi',
    k1none: 'Bugun hali ishlab chiqarilmagan', k2s: '{n} tadan', k2none: 'Hammasi yetarli', k3s: 'barcha turdagi hujjatlar', k4s: 'kuniga oʻrtacha {n} dona',
    rawTitle: 'Xomashyo qoldiqlari', rawAll: 'Barcha qoldiqlar', colName: 'Xomashyo', colLevel: 'Zaxira', colQty: 'Qoldiq', colDays: 'Yetadi',
    capTitle: 'Ishlab chiqarish imkoniyati', capNote: 'Har biri alohida hisoblangan — umumiy xomashyodan. Ikkalasini birga chiqarib boʻlmaydi.',
    capMax: 'maksimal', capLim: 'cheklovchi', capNoRecipe: 'Faol retsept yoʻq', fgTitle: 'Tayyor mahsulot',
    chartTitle: 'Soʻnggi 7 kun', tableView: 'Jadval koʻrinishi', colDay: 'Kun', total: 'Jami',
    docsTitle: 'Soʻnggi hujjatlar', docsAll: 'Jurnalni ochish', noDocs: 'Hali hujjatlar yoʻq',
    wk1: 'Kam qolganlar', wk1s: 'hammasi yetarli', wk2: 'Bugungi kirim', wk2s: '{n} nakladnoy', wk3: 'Bugungi tuzatish / brak', wk4: 'Pozitsiyalar', wk4s: '{r} xomashyo · {f} tayyor mahsulot',
    zTitle: 'Zaxira', lowTitle: 'Kam qolganlar', lowNone: 'Hozircha kam qolgan pozitsiya yoʻq.', toTarget: 'Maqsadli zaxiragacha', lastIn: 'Oxirgi kirimlar', ledgerLink: 'Jurnal',
    weekdays: ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'],
    dateLong: '{wd}, {d}', wdLong: ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'],
    // onboarding
    obPre: '{n} / 3 TAYYOR', obTitle: 'Plitkani birga toʻldiramiz', obSub: 'Tizim hali boʻsh. Uch qadamdan keyin ishlab chiqarishni boshlash mumkin boʻladi.',
    ob1: 'Mahsulot qoʻshing', ob1t: 'Xomashyo (kakao, shakar…) va tayyor mahsulotlar — nomlari oʻzbek va rus tilida.', ob1b: 'Mahsulot qoʻshish',
    ob2: 'Retsept tuzing', ob2t: '1 dona mahsulot uchun qancha xomashyo ketishini grammda kiriting.', ob2b: 'Retsept tuzish', ob2w: 'Avval mahsulot qoʻshing',
    ob3: 'Birinchi kirim', ob3t: 'Ombordagi xomashyoni nakladnoy boʻyicha kiriting — qoldiqlar shundan boshlanadi.', ob3b: 'Kirim qilish', ob3w: 'Avval retsept tuzing',
    obNow: 'Hozir', obDone: 'Bajarildi',
    // produce
    prTitle: 'Ishlab chiqarish', prLead: 'Mahsulot va miqdorni tanlang — tizim xomashyoni oʻzi tekshiradi.', prS1: 'Mahsulot', prS2: 'Miqdor',
    dec: 'Kamaytirish', inc: 'Oshirish', maxBtn: 'Maksimal', limiting: 'Cheklovchi xomashyo', notePh: 'Masalan: 1-liniya',
    check: 'Xomashyo tekshiruvi', forN: '{n} dona uchun', per1: '1 dona', need: 'kerak', have: 'bor', enoughAfter: 'Yetarli · keyin qoladi {q}',
    shortLine: 'Kerak {need}, bor {have}, yetishmaydi {s}', result: 'Natija', produceN: '{n} dona ishlab chiqarish', notEnough: 'Xomashyo yetarli emas',
    lowerTo: '{m} ga tushirish', invalidQty: 'Miqdor 1 yoki undan katta butun son boʻlishi kerak', enterQty: 'Miqdorni kiriting',
    largeTitle: 'Odatdagidan katta miqdor', largeText: '{n} dona {p} — hozirgi maksimalning katta qismi. Miqdor toʻgʻriligini tekshiring.', largePct: 'maksimalning {x}%', yesProduce: 'Ha, ishlab chiqarish',
    doneTitle: '{num} yaratildi', doneText: '{n} dona {p} omborga qoʻshildi, xomashyo qoldiqlari yangilandi.', again: 'Yana ishlab chiqarish',
    conflictTitle: 'Qoldiq oʻzgardi, endi koʻpi bilan {m} dona chiqadi', conflictText: 'Shu orada xomashyo boshqa hujjatda ishlatildi. Hech narsa yozilmadi.',
    recipeChanged: 'Retsept yangilandi: v{a} → v{b}.', recipeChangedT: 'Hech narsa yozilmadi. Yangi tarkib va qoldiqlarni koʻrib, qayta bosing.', ok: 'Tushunarli',
    errTitle: 'Hech narsa oʻzgarmadi', noAnswer: 'Server javob bermadi', retrySafe: 'Qayta urinish xavfsiz: shu soʻrov ikki marta yozilmaydi.', noRecipes: 'Ishlab chiqarish uchun faol retseptli mahsulot yoʻq.', noRecipesAdmin: 'Retseptlar boʻlimida retsept tuzing va faollashtiring.', recipeV: 'Retsept v{v}', zeroMax: 'Hozircha birorta ham chiqmaydi',
    // stock
    stTitle: 'Qoldiqlar', stSub: '{n} ta pozitsiya', stSubLow: ' · {n} tasi minimal qoldiqdan past', onlyLow: 'Faqat kamlar', searchPh: 'Nomi yoki kodi…',
    colProduct: 'Mahsulot', colMin: 'Minimum', colEnough: 'Yetadi', history: '{name} — harakatlar tarixi', ledgerAll: 'Jurnalda barchasi →', noHistory: 'Hali harakat yoʻq',
    nothingFound: 'Hech narsa topilmadi', nothingFoundT: 'Qidiruv yoki filtrlarni oʻzgartiring.', clearFilters: 'Filtrlarni tozalash',
    // receipt
    rcTitle: 'Kirim', rcDetails: 'Nakladnoy tafsilotlari', supDocNo: 'Yetkazib beruvchi hujjati №', supDocDate: 'Yetkazib beruvchi hujjati sanasi',
    supDateHelp: 'Faqat qayd uchun. Jurnalga tasdiqlash vaqti yoziladi. Kelajakdagi sana qabul qilinmaydi.', supplier: 'Yetkazib beruvchi', rcNotePh: 'Masalan: 2-mashina',
    lines: 'Qatorlar', colNo: '№', colNowAfter: 'Qoldiq: hozir → keyin', addLine: 'Qator qoʻshish', removeLine: '{n}-qatorni olib tashlash',
    sumLines: 'Qatorlar', sumTotal: 'Jami xomashyo', sumLow: 'Kam qolgandan chiqadi', sumLowNone: '—', enoughWord: 'yetarli', stillLow: 'hali kam',
    rcConfirm: 'Kirimni tasdiqlash', rcDone: '{num} saqlandi', badQty: 'Miqdorni toʻgʻri kiriting', dupLine: 'Bu xomashyo boshqa qatorda bor', pickRaw: 'Xomashyoni tanlang',
    futureDate: 'Kelajakdagi sana boʻlmaydi', noRaw: 'Hali xomashyo yoʻq. Avval Mahsulotlar boʻlimida xomashyo qoʻshing.',
    // adjust
    adTitle: 'Tuzatish', adPre: 'inventarizatsiya', sysQty: 'Tizimdagi qoldiq', counted: 'Haqiqiy sanaldi', diffTitle: 'Farq · aniq',
    diffMore: 'Ortiqcha chiqdi', diffLess: 'Kam chiqdi', diffNone: 'Farq yoʻq', saveAdj: 'Tuzatishni saqlash', noDiff: 'Farq yoʻq — saqlash shart emas',
    adConflictT: 'Qoldiq oʻzgardi, qayta sanang yoki tasdiqlang', adConflictS: 'Siz sanayotganda {doc} yozildi. Hech narsa saqlanmadi.', adConflictS0: 'Siz sanayotganda qoldiq oʻzgardi. Hech narsa saqlanmadi.',
    seen: 'Siz koʻrgan qoldiq', current: 'Hozirgi qoldiq', newDiff: 'Yangi farq', recount: 'Qayta sanash', acceptNew: 'Yangi farq bilan tasdiqlash',
    adDone: '{num} saqlandi: {d} {name}', adNotePh: 'Masalan: 2-javon qayta tortildi',
    // scrap
    scTitle: 'Brak', inStock: 'Omborda {q}', scSave: 'Brakni rasmiylashtirish', scDone: '{num} saqlandi: {q} {name}', moreThanStock: 'Omborda faqat {q} bor',
    pickProduct: 'Mahsulotni tanlang', pickReason: 'Sababni tanlang', noteFor: 'Izoh',
    // ledger
    lgTitle: 'Harakatlar jurnali', myDocs: 'Mening hujjatlarim', vDocs: 'Hujjatlar', vLines: 'Qatorlar', exportCsv: 'Eksport · CSV',
    filters: 'Filtrlar', fNumber: 'Hujjat raqami…', fType: 'Turi', fUser: 'Foydalanuvchi', fFrom: 'Sanadan', fTo: 'Sanagacha',
    colDoc: 'Hujjat', colType: 'Turi', colMoves: 'Harakatlar', colWho: 'Kim', colDate: 'Sana', colAfter: 'Qoldiq (keyin)', after: 'qoldiq {q}',
    andMore: 'yana {n} xomashyo', reversedBy: 'Storno qilingan → {num}', reverses: '↩ {num} ni bekor qiladi',
    stDone: 'Yakunlangan', stReversed: 'Storno qilingan', recipeK: 'Retsept', supplierK: 'Nakladnoy', reasonK: 'Sabab', noteK: 'Izoh', requestId: 'Soʻrov ID: {id}',
    afterK: 'qoldiq keyin', reverseBtn: 'Storno qilish', reverseInfo: 'Hujjat oʻchirilmaydi: teskari harakatli storno hujjati yaratiladi',
    revTitle: '{num} ni storno qilasizmi?', revText: 'Asl hujjat oʻchmaydi. Yangi STR hujjati quyidagi teskari harakatlarni yozadi:', revWhyPh: 'Masalan: miqdor notoʻgʻri kiritilgan',
    revWhyShort: 'Sababni kamida 3 belgida yozing', revDone: '{num} yaratildi. Asl hujjat jurnalda qoldi.', revNeg: 'Storno qilib boʻlmaydi: qoldiq manfiy boʻlib qoladi',
    revNegLine: '{name}: hozir {cur}, storno {d}, natija {w}', emptyLedger: 'Hali harakatlar yoʻq', emptyLedgerT: 'Birinchi kirim yoki ishlab chiqarishdan keyin har bir harakat shu yerda paydo boʻladi.',
    expand: 'Ochish: {num}', collapse: 'Yopish: {num}', csvBusy: 'Eksport tayyorlanmoqda…',
    t_receipt: 'Kirim', t_production: 'Ishlab chiqarish', t_adjustment: 'Tuzatish', t_scrap: 'Brak', t_reversal: 'Storno',
    // products
    pdTitle: 'Mahsulotlar', pdSub: '{r} xomashyo · {f} tayyor mahsulot · nomlar ikki tilda', newProduct: '+ Yangi mahsulot', active: 'Faol', archive: 'Arxiv',
    colCode: 'Kod', colNameUz: 'Nomi · UZ', colNameRu: 'Nomi · RU', colKind: 'Turi', colUnit: 'Birlik', colTarget: 'Maqsadli zaxira',
    pdNew: 'Yangi mahsulot', pdName: 'Nomi', uzName: 'Oʻzbekcha', ruName: 'Русский', code: 'Kod', codeHelp: 'Boʻsh qoldirilsa, avtomatik beriladi (XA-006, TM-004)',
    kind: 'Turi', unit: 'Birlik', minQty: 'Minimal qoldiq', targetQty: 'Maqsadli zaxira', targetHelp: 'Indikatorda: maqsadli zaxira = toʻla plitka, chiziq = minimum',
    lockedHelp: 'Kod, tur va birlik yaratilgandan keyin oʻzgarmaydi', archiveBtn: 'Arxivlash', unarchiveBtn: 'Arxivdan qaytarish',
    archiveHelp: 'Tarixi bor mahsulot oʻchirilmaydi. Arxivdagi mahsulot yangi hujjatlarda chiqmaydi, eski hujjatlar oʻzgarmaydi.',
    pdSaved: 'Saqlandi', pdCreated: '{code} yaratildi', pdArchived: '{code} arxivga oʻtdi', pdUnarchived: '{code} faollashtirildi', readOnly: 'Faqat koʻrish', unitPcs: 'dona',
    targetBelowMin: 'Maqsadli zaxira minimumdan kam boʻlmasin',
    // recipes
    rcpTitle: 'Retseptlar', rcpActive: 'v{v} faol', rcpVersions: '{n} versiya', rcpDraftOnly: 'Faqat qoralama', rcpNone: 'Retsept yoʻq', rcpDraftToo: ' · v{v} qoralama',
    activeV: 'Faol: v{v}', noActive: 'Faol versiya yoʻq', vArchived: 'Arxiv', vActive: 'Faol', vDraft: 'Qoralama',
    compTitle: 'v{v} tarkibi · 1 dona uchun', norm: 'Norma', diffWith: 'v{v} bilan farq', enoughFor: 'Omborda yetadi', limitingW: 'cheklovchi',
    unchanged: 'oʻzgarmagan', newLine: 'yangi', removed: 'olib tashlangan', draftTitle: 'v{v} qoralama', draftHelp: 'Norma butun grammda (yoki donada), 1 dona uchun',
    addRaw: '+ Xomashyo qoʻshish', activateV: 'v{v} ni faollashtirish', saveDraft: 'Qoralamani saqlash', deleteDraft: 'Qoralamani oʻchirish', newVersion: '+ Yangi versiya',
    actTitle: 'v{v} ni faollashtirasizmi?', actText: 'Yangi ishlab chiqarishlar v{v} boʻyicha hisoblanadi. Oldingi hujjatlar oʻzgarmaydi.', actOld: 'v{v} arxivga oʻtadi', actNew: 'v{v} faollashadi',
    actDone: 'v{v} faollashtirildi.', draftSaved: 'Qoralama saqlandi', draftDeleted: 'Qoralama oʻchirildi', rcpNote: 'Izoh (nima oʻzgardi)',
    noFinished: 'Hali tayyor mahsulot yoʻq. Avval Mahsulotlar boʻlimida tayyor mahsulot qoʻshing.', delDraftQ: 'Qoralamani oʻchirasizmi?', unsaved: 'Saqlanmagan oʻzgarishlar bor',
    // users
    usTitle: 'Foydalanuvchilar', usSub: '{n} ta foydalanuvchi', usSubBlocked: ' · {n} tasi bloklangan', newUser: '+ Yangi foydalanuvchi',
    colUser: 'Ism', colLogin: 'Login', colRole: 'Rol', colStatus: 'Holat', colLast: 'Oxirgi kirish',
    usActive: 'Faol', usBlocked: 'Bloklangan', usLocked: 'Vaqtincha qulflangan', usMustChange: 'Parol almashtirishi kerak',
    resetPw: 'Parolni tiklash', block: 'Bloklash', unblock: 'Blokdan chiqarish', fullName: 'Ism familiya', role: 'Rol',
    tmpPw: 'Vaqtinchalik parol', pwRepeat: 'Parolni takrorlang', pwHelp: 'Kamida 8 belgi, harf va raqam', mustChange: 'Birinchi kirishda parolni almashtirsin',
    resetNote: 'Foydalanuvchi keyingi kirishda parolni almashtiradi. Eski sessiyalar yopiladi.', setPw: 'Parolni oʻrnatish', usCreated: '{login} yaratildi', usSaved: 'Saqlandi', pwSet: 'Parol oʻrnatildi',
    neverLogged: 'hali kirmagan', you: 'siz', loginHelp2: '3–64 belgi: kichik lotin harflari, raqam, «.», «_» yoki «-»',
    // errors pages
    nfTitle: 'Sahifa topilmadi', nfText: 'Bu boʻlakcha plitkada yoʻq. Havola eskirgan yoki manzil xato yozilgan boʻlishi mumkin.', toHome: 'Bosh sahifaga',
    fbTitle: 'Bu boʻlimga ruxsat yoʻq', fbText: 'Sizning rolingiz — {role}. Kerak boʻlsa, administratorga murojaat qiling.',
    // print
    prnReceipt: 'Kirim nakladnoyi', prnProduction: 'Ishlab chiqarish nakladnoyi', prnDoc: 'Hujjat', prnDate: 'Sana', prnWho: 'Rasmiylashtirdi',
    prnGave: 'Topshirdi (yetkazib beruvchi vakili)', prnTook: 'Qabul qildi (omborchi)', prnMade: 'Ishlab chiqardi (operator)', prnChecked: 'Tekshirdi',
    prnLine: 'Nomi', prnBack: '← Orqaga', prnUsed: 'Sarflangan xomashyo', prnOut: 'Chiqarilgan mahsulot',
  },
  ru: {
    appName: 'Chocolate Factory',
    role_admin: 'Администратор', role_warehouse: 'Кладовщик', role_operator: 'Оператор производства',
    menu: 'Главное меню', sProd: 'Производство', sStock: 'Склад', sCat: 'Справочники', sSys: 'Система',
    nav_dashboard: 'Панель управления', nav_wh: 'Панель склада', nav_produce: 'Производство', nav_stock: 'Остатки',
    nav_receipt: 'Приход', nav_adjust: 'Корректировка', nav_scrap: 'Брак', nav_ledger: 'Журнал движений',
    nav_products: 'Продукты', nav_recipes: 'Рецепты', nav_users: 'Пользователи', nav_mydocs: 'Мои документы',
    view: 'просмотр', logout: 'Выйти', openMenu: 'Открыть меню', closeMenu: 'Закрыть меню', lang: 'Язык',
    lowBadge: 'Сырьё на исходе: {n} поз.',
    g: 'г', kg: 'кг', pcs: 'шт.', day: 'дн.',
    save: 'Сохранить', cancel: 'Отмена', close: 'Закрыть', edit: 'Изменить', all: 'Все', search: 'Поиск',
    loading: 'Загрузка…', retry: 'Повторить', yes: 'Да', optional: '(необязательно)', required: 'обязательно',
    raw: 'Сырьё', finished: 'Готовая продукция', product: 'Продукт', qty: 'Количество', note: 'Комментарий', reason: 'Причина',
    choose: 'Выберите…', sending: 'Отправка…', saving: 'Сохранение…', min: 'мин.', minimum: 'Минимум',
    stockNow: 'Остаток', print: 'Печать', openDoc: 'Открыть документ', autoNumber: 'номер присваивается автоматически',
    prev: 'Предыдущая страница', next: 'Следующая страница', shown: '{a}–{b} из {n}', none: '—',
    low: 'Мало', out: 'Нет', days: '{n} дн.', reasonRequired: 'Причина обязательна',
    noteRequiredOther: 'При причине «Другое» комментарий обязателен',
    netErr: 'Нет связи с сервером. Ничего не изменилось — попробуйте ещё раз.',
    sessionEnded: 'Сессия завершена. Войдите снова.',
    tagline: 'От какао до плитки — каждый грамм на учёте.',
    loginTitle: 'Вход в систему', loginSub: 'Войдите в аккаунт, чтобы начать работу.',
    login: 'Логин', password: 'Пароль', remember: 'Запомнить меня', enter: 'Войти',
    loginHelp: 'Забыли пароль? Обратитесь к администратору.',
    pcTitle: 'Установите новый пароль', pcSub: 'Здравствуйте, {name}. Администратор выдал вам временный пароль. Чтобы продолжить, установите свой пароль.',
    pcCurrent: 'Временный пароль', pcNew: 'Новый пароль', pcRepeat: 'Повторите новый пароль',
    pcR1: 'Не менее 8 символов', pcR2: 'Есть буквы и цифры', pcR3: 'Отличается от временного', pcMismatch: 'Пароли не совпадают',
    pcSave: 'Сохранить и продолжить', pcSkip: 'Этот шаг нельзя пропустить.', pcDone: 'Пароль обновлён',
    dashTitle: 'Панель управления', whTitle: 'Панель склада', btnReceipt: 'Оформить приход', btnProduce: 'Производство', btnAdjust: 'Корректировка',
    alertLow1: '{name} ниже минимального остатка:', alertLow1t: 'осталось {qty} (минимум {min}).', alertLowDays: ' Хватит примерно на {d} дн.',
    alertLowMany: 'Ниже минимального остатка — {n} поз.:', alertOut: '{name} закончился.',
    k1: 'Произведено сегодня', k2: 'Сырьё на исходе', k3: 'Документы за сегодня', k4: 'Произведено за 7 дней',
    k1none: 'Сегодня ещё не производили', k2s: 'из {n}', k2none: 'Всего достаточно', k3s: 'документы всех типов', k4s: 'в среднем {n} шт. в день',
    rawTitle: 'Остатки сырья', rawAll: 'Все остатки', colName: 'Сырьё', colLevel: 'Запас', colQty: 'Остаток', colDays: 'Хватит',
    capTitle: 'Можно произвести', capNote: 'Каждое рассчитано отдельно — из общего сырья. Оба сразу произвести нельзя.',
    capMax: 'максимум', capLim: 'ограничивает', capNoRecipe: 'Нет активного рецепта', fgTitle: 'Готовая продукция',
    chartTitle: 'Последние 7 дней', tableView: 'Показать таблицей', colDay: 'День', total: 'Всего',
    docsTitle: 'Последние документы', docsAll: 'Открыть журнал', noDocs: 'Документов пока нет',
    wk1: 'На исходе', wk1s: 'всего достаточно', wk2: 'Приход сегодня', wk2s: 'накладных: {n}', wk3: 'Корректировки / брак сегодня', wk4: 'Позиции', wk4s: '{r} сырья · {f} готовой продукции',
    zTitle: 'Запас', lowTitle: 'На исходе', lowNone: 'Сейчас всего достаточно.', toTarget: 'До целевого запаса', lastIn: 'Последние приходы', ledgerLink: 'Журнал',
    weekdays: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    dateLong: '{wd}, {d}', wdLong: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
    obPre: 'ГОТОВО {n} / 3', obTitle: 'Заполним плитку вместе', obSub: 'Система пока пустая. После трёх шагов можно начинать производство.',
    ob1: 'Добавьте продукты', ob1t: 'Сырьё (какао, сахар…) и готовая продукция — названия на узбекском и русском.', ob1b: 'Добавить продукт',
    ob2: 'Составьте рецепт', ob2t: 'Укажите в граммах, сколько сырья уходит на 1 шт.', ob2b: 'Составить рецепт', ob2w: 'Сначала добавьте продукт',
    ob3: 'Первый приход', ob3t: 'Оприходуйте сырьё по накладной — с этого начнутся остатки.', ob3b: 'Оформить приход', ob3w: 'Сначала составьте рецепт',
    obNow: 'Сейчас', obDone: 'Готово',
    prTitle: 'Производство', prLead: 'Выберите продукт и количество — система сама проверит сырьё.', prS1: 'Продукт', prS2: 'Количество',
    dec: 'Уменьшить', inc: 'Увеличить', maxBtn: 'Максимум', limiting: 'Ограничивающее сырьё', notePh: 'Например: линия 1',
    check: 'Проверка сырья', forN: 'на {n} шт.', per1: '1 шт.', need: 'нужно', have: 'есть', enoughAfter: 'Достаточно · останется {q}',
    shortLine: 'Нужно {need}, есть {have}, не хватает {s}', result: 'Итог', produceN: 'Произвести {n} шт.', notEnough: 'Недостаточно сырья',
    lowerTo: 'Уменьшить до {m}', invalidQty: 'Количество должно быть целым числом от 1', enterQty: 'Введите количество',
    largeTitle: 'Количество больше обычного', largeText: '{n} шт. «{p}» — большая часть текущего максимума. Проверьте количество.', largePct: '{x}% от максимума', yesProduce: 'Да, произвести',
    doneTitle: 'Создан документ {num}', doneText: '{n} шт. «{p}» добавлено на склад, остатки сырья обновлены.', again: 'Произвести ещё',
    conflictTitle: 'Остаток изменился: теперь можно не больше {m} шт.', conflictText: 'За это время сырьё списано другим документом. Ничего не записано.',
    recipeChanged: 'Рецепт обновлён: v{a} → v{b}.', recipeChangedT: 'Ничего не записано. Проверьте новый состав и остатки, затем нажмите снова.', ok: 'Понятно',
    errTitle: 'Ничего не изменилось', noAnswer: 'Сервер не ответил', retrySafe: 'Повторить безопасно: этот запрос не запишется дважды.', noRecipes: 'Нет продуктов с активным рецептом.', noRecipesAdmin: 'Составьте и активируйте рецепт в разделе «Рецепты».', recipeV: 'Рецепт v{v}', zeroMax: 'Сейчас нельзя произвести ни одной',
    stTitle: 'Остатки', stSub: 'Позиций: {n}', stSubLow: ' · ниже минимума: {n}', onlyLow: 'Только на исходе', searchPh: 'Название или код…',
    colProduct: 'Продукт', colMin: 'Минимум', colEnough: 'Хватит', history: '{name} — история движений', ledgerAll: 'Всё в журнале →', noHistory: 'Движений пока нет',
    nothingFound: 'Ничего не найдено', nothingFoundT: 'Измените поиск или фильтры.', clearFilters: 'Сбросить фильтры',
    rcTitle: 'Приход', rcDetails: 'Данные накладной', supDocNo: '№ документа поставщика', supDocDate: 'Дата документа поставщика',
    supDateHelp: 'Только для учёта. В журнал записывается время подтверждения. Будущая дата не принимается.', supplier: 'Поставщик', rcNotePh: 'Например: машина 2',
    lines: 'Строки', colNo: '№', colNowAfter: 'Остаток: сейчас → после', addLine: 'Добавить строку', removeLine: 'Удалить строку {n}',
    sumLines: 'Строк', sumTotal: 'Всего сырья', sumLow: 'Выйдет из «мало»', sumLowNone: '—', enoughWord: 'достаточно', stillLow: 'всё ещё мало',
    rcConfirm: 'Подтвердить приход', rcDone: '{num} сохранён', badQty: 'Введите корректное количество', dupLine: 'Это сырьё уже есть в другой строке', pickRaw: 'Выберите сырьё',
    futureDate: 'Дата не может быть в будущем', noRaw: 'Сырья пока нет. Сначала добавьте сырьё в разделе «Продукты».',
    adTitle: 'Корректировка', adPre: 'инвентаризация', sysQty: 'Остаток в системе', counted: 'Фактически насчитано', diffTitle: 'Разница · точно',
    diffMore: 'Излишек', diffLess: 'Недостача', diffNone: 'Разницы нет', saveAdj: 'Сохранить корректировку', noDiff: 'Разницы нет — сохранять не нужно',
    adConflictT: 'Остаток изменился — пересчитайте или подтвердите', adConflictS: 'Пока вы считали, записан {doc}. Ничего не сохранено.', adConflictS0: 'Пока вы считали, остаток изменился. Ничего не сохранено.',
    seen: 'Остаток, который вы видели', current: 'Текущий остаток', newDiff: 'Новая разница', recount: 'Пересчитать', acceptNew: 'Подтвердить с новой разницей',
    adDone: '{num} сохранён: {d} {name}', adNotePh: 'Например: перевесили полку 2',
    scTitle: 'Брак', inStock: 'На складе {q}', scSave: 'Оформить брак', scDone: '{num} сохранён: {q} {name}', moreThanStock: 'На складе только {q}',
    pickProduct: 'Выберите продукт', pickReason: 'Выберите причину', noteFor: 'Комментарий',
    lgTitle: 'Журнал движений', myDocs: 'Мои документы', vDocs: 'Документы', vLines: 'Строки', exportCsv: 'Экспорт · CSV',
    filters: 'Фильтры', fNumber: 'Номер документа…', fType: 'Тип', fUser: 'Пользователь', fFrom: 'С даты', fTo: 'По дату',
    colDoc: 'Документ', colType: 'Тип', colMoves: 'Движения', colWho: 'Кто', colDate: 'Дата', colAfter: 'Остаток (после)', after: 'остаток {q}',
    andMore: 'ещё {n} поз. сырья', reversedBy: 'Сторнирован → {num}', reverses: '↩ отменяет {num}',
    stDone: 'Проведён', stReversed: 'Сторнирован', recipeK: 'Рецепт', supplierK: 'Накладная', reasonK: 'Причина', noteK: 'Комментарий', requestId: 'ID запроса: {id}',
    afterK: 'остаток после', reverseBtn: 'Сторнировать', reverseInfo: 'Документ не удаляется: создаётся сторно-документ с обратными движениями',
    revTitle: 'Сторнировать {num}?', revText: 'Исходный документ не удаляется. Новый документ STR запишет обратные движения:', revWhyPh: 'Например: неверно введено количество',
    revWhyShort: 'Укажите причину (не менее 3 символов)', revDone: 'Создан {num}. Исходный документ остался в журнале.', revNeg: 'Сторнировать нельзя: остаток станет отрицательным',
    revNegLine: '{name}: сейчас {cur}, сторно {d}, итог {w}', emptyLedger: 'Движений пока нет', emptyLedgerT: 'После первого прихода или производства каждое движение появится здесь.',
    expand: 'Открыть: {num}', collapse: 'Свернуть: {num}', csvBusy: 'Готовим экспорт…',
    t_receipt: 'Приход', t_production: 'Производство', t_adjustment: 'Корректировка', t_scrap: 'Брак', t_reversal: 'Сторно',
    pdTitle: 'Продукты', pdSub: '{r} сырья · {f} готовой продукции · названия на двух языках', newProduct: '+ Новый продукт', active: 'Активные', archive: 'Архив',
    colCode: 'Код', colNameUz: 'Название · UZ', colNameRu: 'Название · RU', colKind: 'Тип', colUnit: 'Ед.', colTarget: 'Целевой запас',
    pdNew: 'Новый продукт', pdName: 'Название', uzName: 'Oʻzbekcha', ruName: 'Русский', code: 'Код', codeHelp: 'Если оставить пустым, присвоится автоматически (XA-006, TM-004)',
    kind: 'Тип', unit: 'Единица', minQty: 'Минимальный остаток', targetQty: 'Целевой запас', targetHelp: 'На индикаторе: целевой запас = полная плитка, черта = минимум',
    lockedHelp: 'Код, тип и единица не меняются после создания', archiveBtn: 'В архив', unarchiveBtn: 'Вернуть из архива',
    archiveHelp: 'Продукт с историей не удаляется. Архивный продукт не появляется в новых документах, старые документы не меняются.',
    pdSaved: 'Сохранено', pdCreated: '{code} создан', pdArchived: '{code} перенесён в архив', pdUnarchived: '{code} снова активен', readOnly: 'Только просмотр', unitPcs: 'шт.',
    targetBelowMin: 'Целевой запас не может быть меньше минимума',
    rcpTitle: 'Рецепты', rcpActive: 'активна v{v}', rcpVersions: 'версий: {n}', rcpDraftOnly: 'Только черновик', rcpNone: 'Рецепта нет', rcpDraftToo: ' · черновик v{v}',
    activeV: 'Активна: v{v}', noActive: 'Нет активной версии', vArchived: 'Архив', vActive: 'Активна', vDraft: 'Черновик',
    compTitle: 'Состав v{v} · на 1 шт.', norm: 'Норма', diffWith: 'Разница с v{v}', enoughFor: 'Хватит на складе', limitingW: 'ограничивает',
    unchanged: 'без изменений', newLine: 'новое', removed: 'удалено', draftTitle: 'Черновик v{v}', draftHelp: 'Норма в целых граммах (или штуках) на 1 шт.',
    addRaw: '+ Добавить сырьё', activateV: 'Активировать v{v}', saveDraft: 'Сохранить черновик', deleteDraft: 'Удалить черновик', newVersion: '+ Новая версия',
    actTitle: 'Активировать v{v}?', actText: 'Новые производства будут считаться по v{v}. Прошлые документы не изменятся.', actOld: 'v{v} уйдёт в архив', actNew: 'v{v} станет активной',
    actDone: 'v{v} активирована.', draftSaved: 'Черновик сохранён', draftDeleted: 'Черновик удалён', rcpNote: 'Комментарий (что изменилось)',
    noFinished: 'Готовой продукции пока нет. Сначала добавьте её в разделе «Продукты».', delDraftQ: 'Удалить черновик?', unsaved: 'Есть несохранённые изменения',
    usTitle: 'Пользователи', usSub: 'Пользователей: {n}', usSubBlocked: ' · заблокировано: {n}', newUser: '+ Новый пользователь',
    colUser: 'Имя', colLogin: 'Логин', colRole: 'Роль', colStatus: 'Статус', colLast: 'Последний вход',
    usActive: 'Активен', usBlocked: 'Заблокирован', usLocked: 'Временно заблокирован', usMustChange: 'Должен сменить пароль',
    resetPw: 'Сбросить пароль', block: 'Заблокировать', unblock: 'Разблокировать', fullName: 'Имя и фамилия', role: 'Роль',
    tmpPw: 'Временный пароль', pwRepeat: 'Повторите пароль', pwHelp: 'Не менее 8 символов, буквы и цифры', mustChange: 'Сменить пароль при первом входе',
    resetNote: 'Пользователь сменит пароль при следующем входе. Старые сессии закроются.', setPw: 'Установить пароль', usCreated: '{login} создан', usSaved: 'Сохранено', pwSet: 'Пароль установлен',
    neverLogged: 'ещё не входил', you: 'вы', loginHelp2: '3–64 символа: строчные латинские буквы, цифры, «.», «_» или «-»',
    nfTitle: 'Страница не найдена', nfText: 'Этого кусочка нет в плитке. Ссылка устарела или адрес набран с ошибкой.', toHome: 'На главную',
    fbTitle: 'Нет доступа к разделу', fbText: 'Ваша роль — {role}. Если нужно, обратитесь к администратору.',
    prnReceipt: 'Приходная накладная', prnProduction: 'Производственная накладная', prnDoc: 'Документ', prnDate: 'Дата', prnWho: 'Оформил',
    prnGave: 'Сдал (представитель поставщика)', prnTook: 'Принял (кладовщик)', prnMade: 'Произвёл (оператор)', prnChecked: 'Проверил',
    prnLine: 'Наименование', prnBack: '← Назад', prnUsed: 'Списанное сырьё', prnOut: 'Выпущенная продукция',
  },
};

/* ---------- 3. Small helpers ---------- */

// Current language text. t('key', {n: 5}) replaces {n} in the text.
function t(key, params) {
  const dict = T[S.lang] || T.uz;
  let s = dict[key];
  if (s == null) s = T.uz[key];
  if (s == null) return key;
  if (params && typeof s === 'string') {
    for (const k of Object.keys(params)) s = s.split('{' + k + '}').join(params[k]);
  }
  return s;
}

// Product name in the current language.
const pname = (p) => (p ? (S.lang === 'ru' ? p.name_ru : p.name_uz) || p.name_uz : '');

// Groups of thousands: 12400 -> "12 400"
const grp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// Short amount, ALWAYS rounded down: 3180 g -> "3,18 kg"; 640 g -> "640 g"; 40 pcs -> "40 dona".
// sign = true adds "+" / "−".
function fq(qty, unit, sign) {
  const n = Number(qty) || 0;
  const a = Math.abs(n);
  const s = sign ? (n < 0 ? '−' : '+') : (n < 0 ? '−' : '');
  if (unit === 'pcs') return s + grp(a) + ' ' + t('pcs');
  if (a < 1000) return s + a + ' ' + t('g');
  const tens = Math.floor(a / 10); // keep two decimals of kg, cut (not round) the rest
  const whole = Math.floor(tens / 100);
  const frac = String(tens % 100).padStart(2, '0').replace(/0+$/, '');
  return s + grp(whole) + (frac ? ',' + frac : '') + ' ' + t('kg');
}

// Exact amount: 3180 g -> "3 180 g"
function fx(qty, unit, sign) {
  const n = Number(qty) || 0;
  const s = sign ? (n < 0 ? '−' : '+') : (n < 0 ? '−' : '');
  return s + grp(Math.abs(n)) + ' ' + (unit === 'pcs' ? t('pcs') : t('g'));
}

// Parse what the user typed into whole base units (grams or pieces).
// mode 'kg' accepts up to 3 decimals ("2,5" -> 2500). No floats are used.
// Returns null when the text is not a valid amount.
function parseQty(text, mode) {
  const s = String(text == null ? '' : text).trim().replace(/\s/g, '').replace(',', '.');
  if (s === '') return null;
  if (mode === 'kg') {
    const m = /^(\d+)(?:\.(\d{1,3}))?$/.exec(s);
    if (!m) return null;
    return parseInt(m[1], 10) * 1000 + parseInt((m[2] || '').padEnd(3, '0') || '0', 10);
  }
  if (!/^\d+$/.test(s)) return null;
  return parseInt(s, 10);
}

// Show a base amount in an input of the given mode ('kg' or 'g').
function qtyToInput(qty, mode) {
  if (qty == null) return '';
  if (mode !== 'kg') return String(qty);
  const whole = Math.floor(qty / 1000);
  const frac = String(qty % 1000).padStart(3, '0').replace(/0+$/, '');
  return whole + (frac ? ',' + frac : '');
}

// Date helpers. The server sends UTC; we show factory time.
function dparts(iso) {
  const d = iso instanceof Date ? iso : new Date(iso);
  const p = {};
  new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).forEach((x) => { p[x.type] = x.value; });
  return p;
}
const fdate = (iso) => { if (!iso) return '—'; const p = dparts(iso); return `${p.day}.${p.month}.${p.year}`; };
const fdt = (iso) => { if (!iso) return '—'; const p = dparts(iso); return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`; };
const fdts = (iso) => { if (!iso) return '—'; const p = dparts(iso); return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}:${p.second}`; };
const ftime = (iso) => { const p = dparts(iso); return `${p.hour}:${p.minute}`; };
const fday = (ymd) => (ymd ? ymd.split('-').reverse().join('.') : '—'); // "2026-11-04" -> "04.11.2026"
function todayYmd() { const p = dparts(new Date()); return `${p.year}-${p.month}-${p.day}`; }
function weekdayOf(ymd) { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
function isToday(iso) { const p = dparts(iso); return `${p.year}-${p.month}-${p.day}` === todayYmd(); }

// Random UUID for request_id (protects from double documents).
function uuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16); crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
const shortName = (name) => { const w = String(name || '').split(/\s+/).filter(Boolean); return w.length > 1 ? `${w[0]} ${w[1][0]}.` : (w[0] || ''); };
const pwOk = (v) => v.length >= 8 && /\p{L}/u.test(v) && /\d/.test(v);

// Safe browser storage (private mode can throw).
const store = {
  get(k) { try { return localStorage.getItem(k) ?? sessionStorage.getItem(k); } catch (e) { return null; } },
  set(k, v, persist) {
    try { (persist ? localStorage : sessionStorage).setItem(k, v); (persist ? sessionStorage : localStorage).removeItem(k); } catch (e) { /* ignore */ }
  },
  del(k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) { /* ignore */ } },
};

/* ---------- 4. Icons (simple stroke SVG paths from the design) ---------- */

const ICONS = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  factory: 'M3 21V10l5 3v-3l5 3V6l8 4v11zM3 21h18',
  box: 'M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10',
  receipt: 'M12 3v12M7 10l5 5 5-5M4 17v3h16v-3',
  adjust: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  scrap: 'M5 5h14v14H5zM9 9l6 6M15 9l-6 6',
  ledger: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
  docs: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
  recipes: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  tag: 'M20 12l-8 8-9-9V3h8zM7.5 6a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3',
  users: 'M9 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  warn: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  chevD: 'M6 9l6 6 6-6',
  chevU: 'M6 15l6-6 6 6',
  chevL: 'M15 6l-6 6 6 6',
  chevR: 'M9 6l6 6-6 6',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M20 20l-3.5-3.5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  undo: 'M9 14l-5-5 5-5M4 9h11a5 5 0 0 1 0 10h-3',
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 11v6M12 7.5v.5',
  print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
};

/* ---------- 5. Global (non-React) state used by helpers and api() ---------- */

const S = {
  token: null,   // access token
  lang: store.get('cf_lang') === 'ru' ? 'ru' : 'uz',
  meta: null,    // reason codes from /documents/meta (cached)
};
// App sets these so api() can react to an expired session / forced password change.
const handlers = { onUnauthorized: () => { }, onPasswordChange: () => { } };

/* ---------- 6. API client ---------- */

class ApiError extends Error {
  constructor({ status, code, message, data, network }) {
    super(message || code || 'Error');
    this.status = status; this.code = code; this.data = data; this.network = !!network;
  }
}

// api('GET', '/stock', {query: {kind: 'raw'}})
// api('POST', '/documents/receipts', {body: {...}})
async function api(method, path, opts = {}) {
  const url = new URL(API_BASE + path, window.location.origin);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
  }
  const headers = { 'Accept-Language': S.lang, Accept: 'application/json' };
  if (S.token && !opts.noAuth) headers.Authorization = 'Bearer ' + S.token;
  let body;
  if (opts.form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(opts.form).toString();
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e) {
    // No answer at all: server down or no network
    throw new ApiError({ status: 0, code: 'NETWORK', message: t('netErr'), network: true });
  }
  if (res.status === 204) return null;
  let json = null;
  try { json = await res.json(); } catch (e) { /* empty body */ }
  if (res.ok) return json;

  const d = (json && json.detail) || {};
  const err = new ApiError({
    status: res.status,
    code: typeof d === 'object' ? d.code : 'UNKNOWN_ERROR',
    message: typeof d === 'object' ? d.message : String(d),
    data: typeof d === 'object' ? d.data : null,
  });
  // 5xx (also 502/504 from nginx when the API is down): every write is idempotent,
  // so the screen offers "Retry" with the same request_id.
  if (res.status >= 500) { err.retryable = true; if (!err.message || err.message === 'undefined') err.message = t('netErr'); }
  if (res.status === 401 && !opts.noAuth) handlers.onUnauthorized();
  if (res.status === 403 && err.code === 'PASSWORD_CHANGE_REQUIRED') handlers.onPasswordChange();
  throw err;
}

// Read every page of a paginated list (used for CSV export). Stops at maxPages.
async function apiAll(path, query, maxPages = 50) {
  const items = [];
  for (let page = 1; page <= maxPages; page++) {
    const r = await api('GET', path, { query: { ...query, page, size: 100 } });
    items.push(...r.items);
    if (page >= (r.pages || 1)) break;
  }
  return items;
}

async function loadMeta() {
  if (!S.meta) S.meta = await api('GET', '/documents/meta');
  return S.meta;
}
const reasonLabel = (r) => (r ? (S.lang === 'ru' ? r.ru : r.uz) : '');
function findReason(code, kind) {
  if (!S.meta || !code) return code || '';
  const lists = kind === 'adjustment' ? [S.meta.adjustment_reasons] : [S.meta.scrap_reasons_raw, S.meta.scrap_reasons_finished, S.meta.adjustment_reasons];
  for (const l of lists) { const r = l.find((x) => x.code === code); if (r) return reasonLabel(r); }
  return code;
}

// One short text that describes what a document moved.
function docSummary(doc) {
  const part = (e) => `${fq(e.qty_delta, e.product.unit, true)} ${pname(e.product)}`;
  const entries = doc.entries || [];
  if (doc.doc_type === 'production') {
    const outs = entries.filter((e) => e.qty_delta < 0);
    const ins = entries.filter((e) => e.qty_delta > 0);
    const head = outs.length > 3 ? outs.slice(0, 2).map(part).join(' · ') + ' · ' + t('andMore', { n: outs.length - 2 }) : outs.map(part).join(' · ');
    return head + ' → ' + ins.map(part).join(' · ');
  }
  return entries.map(part).join(' · ');
}

/* ---------- 7. Router (address after "#") ---------- */

// Which roles can open which screen.
const ROUTES = {
  '/dashboard': { roles: ['admin', 'warehouse'], nav: 'dashboard' },
  '/produce': { roles: ['admin', 'operator'], nav: 'produce' },
  '/stock': { roles: ['admin', 'warehouse', 'operator'], nav: 'stock' },
  '/receipt': { roles: ['admin', 'warehouse'], nav: 'receipt' },
  '/adjust': { roles: ['admin', 'warehouse'], nav: 'adjust' },
  '/scrap': { roles: ['admin', 'warehouse', 'operator'], nav: 'scrap' },
  '/ledger': { roles: ['admin', 'warehouse', 'operator'], nav: 'ledger' },
  '/products': { roles: ['admin', 'warehouse'], nav: 'products' },
  '/recipes': { roles: ['admin'], nav: 'recipes' },
  '/users': { roles: ['admin'], nav: 'users' },
  '/print': { roles: ['admin', 'warehouse', 'operator'], bare: true },
};
const homeFor = (role) => (role === 'operator' ? '/produce' : '/dashboard');

function parseHash() {
  const raw = (window.location.hash || '').replace(/^#/, '') || '/';
  const [pathPart, queryPart] = raw.split('?');
  const segs = pathPart.split('/').filter(Boolean);
  return { raw, path: '/' + (segs[0] || ''), id: segs[1], params: Object.fromEntries(new URLSearchParams(queryPart || '')) };
}

function useRoute() {
  const [r, setR] = useState(parseHash);
  useEffect(() => {
    const h = () => setR(parseHash());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  return r;
}

const go = (path) => { window.location.hash = '#' + path; };

// Replace the query part of the address without reloading the screen (keeps filters in the URL).
function setHashQuery(params) {
  const { path, id } = parseHash();
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
  window.history.replaceState(null, '', '#' + path + (id ? '/' + id : '') + (q ? '?' + q : ''));
}

/* ================================================================
   8. Shared React pieces
   ================================================================ */

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

function Icon({ name, size = 20, style, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style} className={className}>
      <path d={ICONS[name] || ''} />
    </svg>
  );
}

const Logo = () => <span className="logo" aria-hidden="true"><i /><i /><i /><i /></span>;

// Chocolate bar meter: 20 segments, fill = qty / target, black line = min.
function Meter({ qty, min, target, level }) {
  const full = Math.max(target || 0, min * 2 || 0, qty || 0, 1);
  const on = Math.max(0, Math.min(20, Math.round((qty / full) * 20)));
  const minPct = Math.max(0, Math.min(100, (min / full) * 100));
  return (
    <div className="meter" aria-hidden="true">
      <div className="segs">
        {Array.from({ length: 20 }, (_, i) => (
          <i key={i} className={level === 'out' ? 'out' : i < on ? (level === 'low' ? 'low' : 'ok') : ''} />
        ))}
      </div>
      {min > 0 && <div className="min" style={{ left: `calc(${minPct}% - 1px)` }} />}
    </div>
  );
}

const DocBadge = ({ type }) => <span className={`badge b-${type}`}>{t('t_' + type)}</span>;

const Loading = () => <div className="loading"><span className="spin dark" />{t('loading')}</div>;

function Empty({ title, text, children }) {
  return (
    <div className="empty">
      <div className="tile-art" aria-hidden="true"><i /><i /><i /><i className="gap" /></div>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

function Alert({ kind = 'err', title, children, action, icon, inline }) {
  const ic = icon || (kind === 'ok' ? 'check' : kind === 'info' ? 'info' : 'warn');
  return (
    <div className={`alert ${kind}${inline ? ' inline' : ''}`} role={kind === 'ok' ? 'status' : 'alert'}>
      <Icon name={ic} size={22} style={kind === 'warn' ? { color: 'var(--low)' } : undefined} />
      <div className="txt">{title && <strong>{title}</strong>}{children}</div>
      {action}
    </div>
  );
}

// Show an ApiError (or any error) as a red box.
const ErrBox = ({ error }) => (error ? <Alert kind="err">{error.message || t('netErr')}</Alert> : null);

const LowTag = ({ level }) => (level === 'low' ? <span className="lowtag"><Icon name="warn" size={12} />{t('low')}</span>
  : level === 'out' ? <span className="outtag"><Icon name="warn" size={12} />{t('out')}</span> : null);

function Pager({ data, onPage }) {
  if (!data || !data.total) return null;
  const a = (data.page - 1) * data.size + 1; const b = Math.min(data.page * data.size, data.total);
  return (
    <div className="pager">
      <span>{t('shown', { a, b, n: data.total })}</span>
      <div className="row">
        <button className="icon-btn" disabled={data.page <= 1} aria-label={t('prev')} onClick={() => onPage(data.page - 1)}><Icon name="chevL" size={18} /></button>
        <button className="icon-btn" disabled={data.page >= data.pages} aria-label={t('next')} onClick={() => onPage(data.page + 1)}><Icon name="chevR" size={18} /></button>
      </div>
    </div>
  );
}

// kg / g switch for raw materials kept in grams.
function UnitSwitch({ mode, onChange }) {
  return (
    <div className="seg sm" role="group" aria-label={t('unit')}>
      <button type="button" data-mode="kg" aria-pressed={mode === 'kg'} onClick={() => onChange('kg')}>{t('kg')}</button>
      <button type="button" data-mode="g" aria-pressed={mode === 'g'} onClick={() => onChange('g')}>{t('g')}</button>
    </div>
  );
}

// Amount input: for grams it has a kg/g switch, for pieces a "dona" tag.
// value = {text, mode}; unit = 'g' | 'pcs'.
function QtyInput({ id, value, onChange, unit, invalid, disabled, ariaLabel }) {
  const setMode = (m) => {
    const old = parseQty(value.text, value.mode === 'kg' ? 'kg' : 'g');
    onChange({ mode: m, text: old != null ? qtyToInput(old, m) : value.text });
  };
  return (
    <div className="unit-wrap">
      <input className="input mono" id={id} inputMode="decimal" autoComplete="off" value={value.text} disabled={disabled}
        aria-invalid={!!invalid} aria-label={ariaLabel} onChange={(e) => onChange({ ...value, text: e.target.value })} />
      {unit === 'pcs' ? <span className="unit-tag">{t('pcs')}</span> : <UnitSwitch mode={value.mode} onChange={setMode} />}
    </div>
  );
}
const readQty = (v, unit) => parseQty(v.text, unit === 'pcs' ? 'pcs' : v.mode === 'kg' ? 'kg' : 'g');

// Modal or side drawer. Esc and click outside close it.
function Layer({ drawer, onClose, children, dismissable = true }) {
  const boxRef = useRef(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape' && dismissable) closeRef.current(); };
    document.addEventListener('keydown', onKey);
    const el = boxRef.current && (boxRef.current.querySelector('[autofocus], [data-autofocus]') || boxRef.current.querySelector('input, select, textarea, button'));
    if (el) setTimeout(() => el.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
  }, [dismissable]);
  return (
    <div className={'overlay' + (drawer ? ' at-side' : '')} onMouseDown={(e) => { if (e.target === e.currentTarget && dismissable) onClose(); }}>
      <div className={drawer ? 'drawer' : 'modal'} role="dialog" aria-modal="true" ref={boxRef}>{children}</div>
    </div>
  );
}

function DrawerHead({ pre, title, onClose, mono }) {
  return (
    <div className="drawer-head">
      <div>{pre}<h2 style={mono ? undefined : { fontFamily: 'var(--f-head)' }}>{title}</h2></div>
      <button className="icon-btn ghost" aria-label={t('close')} onClick={onClose}><Icon name="x" /></button>
    </div>
  );
}

const Spinner = ({ dark }) => <span className={'spin' + (dark ? ' dark' : '')} />;

// Loads data once (and again when deps change). reload(true) keeps old data on screen.
function useLoad(fn, deps = []) {
  const [st, setSt] = useState({ loading: true, data: null, error: null });
  const fnRef = useRef(fn); fnRef.current = fn;
  const alive = useRef(true);
  const reload = useCallback(async (silent) => {
    if (!silent) setSt((s) => ({ ...s, loading: true, error: null }));
    try {
      const d = await fnRef.current();
      if (alive.current) setSt({ loading: false, data: d, error: null });
      return d;
    } catch (e) {
      if (alive.current) setSt((s) => ({ loading: false, data: silent ? s.data : null, error: e }));
      return null;
    }
  }, []);
  useEffect(() => { alive.current = true; reload(); return () => { alive.current = false; }; }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  const setData = useCallback((d) => setSt((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })), []);
  return { ...st, reload, setData };
}

// Shows loading / error for a useLoad() result. Children is a function of data.
function Async({ state, children }) {
  if (state.error && !state.data) {
    if (state.error.status === 403) return <ErrorPage code={403} />;
    if (state.error.status === 401 || state.error.code === 'PASSWORD_CHANGE_REQUIRED') return null;
    return <Alert kind="err" action={<button className="btn sm" onClick={() => state.reload()}>{t('retry')}</button>}>{state.error.message}</Alert>;
  }
  if (!state.data) return <Loading />;
  return children(state.data);
}

function ErrorPage({ code }) {
  const { me } = useApp();
  if (code === 404) {
    return (
      <div className="err-page">
        <div className="code">4<span style={{ color: 'var(--accent)' }}>0</span>4</div>
        <h1>{t('nfTitle')}</h1><p>{t('nfText')}</p>
        <div className="actions"><a className="btn primary" href={'#' + homeFor(me.role)}>{t('toHome')}</a></div>
      </div>
    );
  }
  return (
    <div className="err-page">
      <Icon name="lock" size={56} />
      <div className="code">403</div>
      <h1>{t('fbTitle')}</h1><p>{t('fbText', { role: t('role_' + me.role) })}</p>
      <div className="actions"><a className="btn primary" href={'#' + homeFor(me.role)}>{t('toHome')}</a></div>
    </div>
  );
}

function PageHead({ pre, title, sub, children }) {
  return (
    <header className="page-head">
      <div>{pre && <p className="pre">{pre}</p>}<h1 tabIndex={-1}>{title}</h1>{sub && <p>{sub}</p>}</div>
      {children && <div className="actions">{children}</div>}
    </header>
  );
}

// If a screen crashes, show a message instead of a blank page.
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error(error, info); }
  render() {
    if (this.state.error) {
      return <Alert kind="err" action={<button className="btn sm" onClick={() => window.location.reload()}>{t('retry')}</button>}>{t('errTitle')}: {String(this.state.error.message || this.state.error)}</Alert>;
    }
    return this.props.children;
  }
}

/* ================================================================
   9. App root: session, language, toasts, confirm dialog
   ================================================================ */

export default function App() {
  const [ready, setReady] = useState(false);
  const [bootErr, setBootErr] = useState('');
  const [me, setMe] = useState(null);
  const [lang, setLangState] = useState(S.lang);
  const [lowCount, setLowCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const route = useRoute();
  S.lang = lang; // helpers read the language from here
  const meRef = useRef(me); meRef.current = me;

  const toast = useCallback((content, kind = '') => {
    const id = Math.random();
    setToasts((l) => [...l, { id, content, kind }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), kind === 'err' ? 7000 : 4500);
  }, []);

  const confirm = useCallback((opts) => new Promise((resolve) => setConfirmState({ ...opts, resolve })), []);

  const logout = useCallback((expired) => {
    const had = !!S.token;
    S.token = null; S.meta = null; store.del('cf_token');
    setMe(null); setLowCount(0);
    // Expired session: keep the address, so after a new login the user returns to the same screen.
    // Manual logout: the next person starts from their own start page.
    if (!expired) window.location.hash = '#/login';
    if (expired && had) toast(t('sessionEnded'), 'err');
  }, [toast]);

  const saveSession = useCallback((auth, persist) => {
    S.token = auth.access_token;
    store.set('cf_token', S.token, persist);
    if (auth.user.lang) { S.lang = auth.user.lang; store.set('cf_lang', S.lang, true); setLangState(S.lang); }
    setMe(auth.user);
  }, []);

  const refreshLow = useCallback(async () => {
    const m = meRef.current;
    if (!m || m.role === 'operator') return;
    try { const st = await api('GET', '/stock', { query: { kind: 'raw' } }); setLowCount(st.filter((x) => x.level !== 'ok').length); } catch (e) { /* not important */ }
  }, []);

  const setLang = useCallback(async (l) => {
    S.lang = l; store.set('cf_lang', l, true); setLangState(l);
    if (S.token && meRef.current) {
      try { const m = await api('PATCH', '/auth/me', { body: { lang: l } }); setMe((old) => ({ ...old, ...m })); } catch (e) { /* language still changes here */ }
    }
  }, []);

  // api() calls these
  handlers.onUnauthorized = () => logout(true);
  handlers.onPasswordChange = () => setMe((m) => (m ? { ...m, must_change_password: true } : m));

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // First load: check the saved token
  useEffect(() => {
    (async () => {
      S.token = store.get('cf_token');
      if (S.token) {
        try {
          const m = await api('GET', '/auth/me');
          if (m.lang) { S.lang = m.lang; setLangState(m.lang); }
          setMe(m);
        } catch (e) {
          if (e.network || e.retryable) setBootErr(t('netErr'));
          else { S.token = null; store.del('cf_token'); }
        }
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => { if (me && !me.must_change_password) refreshLow(); }, [me && me.id, me && me.must_change_password]); // eslint-disable-line react-hooks/exhaustive-deps

  // "#/", "#/login" or "#/password" after login -> show the start page of the role
  const atStart = !!me && !me.must_change_password && ['/', '/login', '/password'].includes(route.path);
  const rt = atStart ? { raw: homeFor(me.role), path: homeFor(me.role), id: undefined, params: {} } : route;
  useEffect(() => { if (atStart) window.history.replaceState(null, '', '#' + homeFor(me.role)); }, [atStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const ctx = useMemo(() => ({ me, setMe, lang, setLang, lowCount, setLowCount, refreshLow, toast, confirm, logout, saveSession }),
    [me, lang, setLang, lowCount, refreshLow, toast, confirm, logout, saveSession]);

  let content;
  if (!ready) content = <Loading />;
  else if (!me) content = <AuthScreen mode="login" initialError={bootErr} />;
  else if (me.must_change_password) content = <AuthScreen mode="password" />;
  else {
    const r = ROUTES[rt.path];
    if (r && r.bare && r.roles.includes(me.role)) content = <main className="main"><PrintPage key={rt.raw} id={rt.id} /></main>;
    else content = <Shell nav={r ? r.nav : ''}><ErrorBoundary key={rt.raw}>{renderPage(rt, me)}</ErrorBoundary></Shell>;
  }

  return (
    <AppCtx.Provider value={ctx}>
      <style>{CSS}</style>
      {content}
      <div className="toasts" role="status">
        {toasts.map((x) => (
          <div key={x.id} className={'toast ' + x.kind}><Icon name={x.kind === 'err' ? 'warn' : 'check'} size={18} /><div>{x.content}</div></div>
        ))}
      </div>
      {confirmState && (
        <Layer onClose={() => { confirmState.resolve(false); setConfirmState(null); }}>
          <h2>{confirmState.title}</h2>
          {confirmState.text && <p>{confirmState.text}</p>}
          {confirmState.extra}
          <div className="foot">
            <button className="btn" onClick={() => { confirmState.resolve(false); setConfirmState(null); }}>{t('cancel')}</button>
            <button className={'btn ' + (confirmState.danger ? 'danger' : 'primary')} data-autofocus data-ok
              onClick={() => { confirmState.resolve(true); setConfirmState(null); }}>{confirmState.okText || t('yes')}</button>
          </div>
        </Layer>
      )}
    </AppCtx.Provider>
  );
}

// Picks the screen for the current address. key = full address, so a new address starts a fresh screen.
function renderPage(route, me) {
  const r = ROUTES[route.path];
  if (!r) return route.path === '/' ? <Loading /> : <ErrorPage code={404} />;
  if (!r.roles.includes(me.role)) return <ErrorPage code={403} />;
  const props = { key: route.raw, params: route.params, id: route.id };
  switch (route.path) {
    case '/dashboard': return me.role === 'warehouse' ? <WarehousePage {...props} /> : <DashboardPage {...props} />;
    case '/produce': return <ProducePage {...props} />;
    case '/stock': return <StockPage {...props} />;
    case '/receipt': return <ReceiptPage {...props} />;
    case '/adjust': return <AdjustPage {...props} />;
    case '/scrap': return <ScrapPage {...props} />;
    case '/ledger': return <LedgerPage {...props} />;
    case '/products': return <ProductsPage {...props} />;
    case '/recipes': return <RecipesPage {...props} />;
    case '/users': return <UsersPage {...props} />;
    default: return <ErrorPage code={404} />;
  }
}

/* ---------- Sidebar + page frame ---------- */

function menuFor(role, low) {
  const badge = low > 0 ? String(low) : '';
  if (role === 'warehouse') {
    return [['dashboard', 'grid', t('nav_wh')], ['stock', 'box', null, badge], ['receipt', 'receipt'], ['adjust', 'adjust'], ['scrap', 'scrap'], ['ledger', 'ledger'], ['products', 'tag', null, '', t('view')]];
  }
  if (role === 'operator') {
    return [['produce', 'factory'], ['stock', 'box', null, '', t('view')], ['ledger', 'docs', t('nav_mydocs')], ['scrap', 'scrap']];
  }
  return [['#', t('sProd')], ['dashboard', 'grid'], ['produce', 'factory'], ['#', t('sStock')], ['stock', 'box', null, badge], ['receipt', 'receipt'], ['adjust', 'adjust'], ['scrap', 'scrap'], ['ledger', 'ledger'],
  ['#', t('sCat')], ['products', 'tag'], ['recipes', 'recipes'], ['#', t('sSys')], ['users', 'users']];
}

function Shell({ nav, children }) {
  const { me, lang, setLang, lowCount, logout } = useApp();
  const [open, setOpen] = useState(false);
  const home = '#' + homeFor(me.role);
  return (
    <div className={'app' + (open ? ' menu-open' : '')}>
      <div className="topbar">
        <a className="brand" href={home}><Logo /><b>{t('appName')}</b></a>
        <button type="button" id="menuBtn" aria-label={t('openMenu')} aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="menu" size={22} /></button>
      </div>
      <aside className="side">
        <a className="brand" href={home}><Logo /><b>{t('appName')}</b></a>
        <nav className="nav" aria-label={t('menu')}>
          {menuFor(me.role, lowCount).map((e, i) => {
            if (e[0] === '#') return <div className="sec" key={i}>{e[1]}</div>;
            const [key, icon, label, badge, note] = e;
            const on = key === nav;
            return (
              <a key={key} href={'#/' + key} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined} onClick={() => setOpen(false)}>
                <Icon name={icon} /><span className="lbl">{label || t('nav_' + key)}</span>
                {note && <span className="note">{note}</span>}
                {badge && <span className="badge" title={t('lowBadge', { n: badge })}>{badge}</span>}
              </a>
            );
          })}
        </nav>
        <div className="side-foot">
          <div className="langsw" role="group" aria-label={t('lang')}>
            <button type="button" data-lang="uz" aria-pressed={lang === 'uz'} onClick={() => setLang('uz')}>Oʻzbekcha</button>
            <button type="button" data-lang="ru" aria-pressed={lang === 'ru'} onClick={() => setLang('ru')}>Русский</button>
          </div>
          <div className="me">
            <span className="ava" aria-hidden="true">{initials(me.full_name)}</span>
            <span className="who"><b>{me.full_name}</b><span>{t('role_' + me.role)}</span></span>
            <button type="button" id="logoutBtn" aria-label={t('logout')} title={t('logout')} onClick={() => logout(false)}><Icon name="logout" size={18} /></button>
          </div>
        </div>
      </aside>
      <div className="scrim" onClick={() => setOpen(false)} />
      <main className="main" id="main">{children}</main>
    </div>
  );
}

/* ---------- Login and forced password change ---------- */

function AuthScreen({ mode, initialError }) {
  const { lang, setLang } = useApp();
  return (
    <div className="auth">
      <section className="auth-art" aria-hidden="true">
        <div className="brand" style={{ padding: 0 }}><Logo /><b style={{ fontSize: 18 }}>{t('appName')}</b></div>
        <div className="bar">{Array.from({ length: 18 }, (_, i) => <i key={i} className={i === 5 ? 'gap' : ''} />)}</div>
        <div className="tag">{t('tagline')}</div>
      </section>
      <section className="auth-form">
        <div className="seg" role="group" aria-label="Til / Язык">
          <button type="button" aria-pressed={lang === 'uz'} onClick={() => setLang('uz')}>Oʻzbekcha</button>
          <button type="button" aria-pressed={lang === 'ru'} onClick={() => setLang('ru')}>Русский</button>
        </div>
        {mode === 'password' ? <PasswordForm /> : <LoginForm initialError={initialError} />}
      </section>
    </div>
  );
}

function LoginForm({ initialError }) {
  const { saveSession } = useApp();
  const [login, setLogin] = useState(store.get('cf_login') || '');
  const [pw, setPw] = useState('');
  const [remember, setRemember] = useState(store.get('cf_remember') !== '0');
  const [err, setErr] = useState(initialError ? { message: initialError } : null);
  const [busy, setBusy] = useState(false);
  const pwRef = useRef(null);
  const submit = async (e) => {
    e.preventDefault();
    const username = login.trim().toLowerCase();
    if (!username || !pw) return;
    setBusy(true); setErr(null);
    try {
      const auth = await api('POST', '/auth/login', { form: { username, password: pw }, noAuth: true });
      store.set('cf_login', username, true); store.set('cf_remember', remember ? '1' : '0', true);
      saveSession(auth, remember);
    } catch (ex) {
      setBusy(false); setErr(ex); setPw('');
      if (pwRef.current) pwRef.current.focus();
    }
  };
  return (
    <form id="loginForm" onSubmit={submit} noValidate>
      <div><h1>{t('loginTitle')}</h1><p className="muted" style={{ marginTop: 8 }}>{t('loginSub')}</p></div>
      <ErrBox error={err} />
      <div className="field"><label htmlFor="lg">{t('login')}</label>
        <input className="input mono" id="lg" autoComplete="username" autoCapitalize="none" spellCheck="false" value={login} autoFocus={!login} onChange={(e) => setLogin(e.target.value)} /></div>
      <div className="field"><label htmlFor="pw">{t('password')}</label>
        <input className="input" id="pw" type="password" autoComplete="current-password" ref={pwRef} autoFocus={!!login} value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      <label className="row" style={{ minHeight: 44, fontSize: 14 }}><input type="checkbox" className="cb" checked={remember} onChange={(e) => setRemember(e.target.checked)} />{t('remember')}</label>
      <button className="btn primary big" type="submit" id="lgBtn" disabled={busy}>{busy ? <><Spinner />{t('enter')}…</> : t('enter')}</button>
      <p className="small muted">{t('loginHelp')}</p>
    </form>
  );
}

function PasswordForm() {
  const { me, saveSession, logout, toast } = useApp();
  const [p0, setP0] = useState(''); const [p1, setP1] = useState(''); const [p2, setP2] = useState('');
  const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  const r1 = p1.length >= 8; const r2 = /\p{L}/u.test(p1) && /\d/.test(p1); const r3 = p1.length > 0 && p1 !== p0;
  const mismatch = p2.length > 0 && p2 !== p1;
  const can = p0 && r1 && r2 && r3 && p2 === p1;
  const submit = async (e) => {
    e.preventDefault(); if (!can) return;
    setBusy(true); setErr(null);
    try {
      const auth = await api('POST', '/auth/change-password', { body: { current_password: p0, new_password: p1 } });
      saveSession(auth, store.get('cf_remember') !== '0'); toast(t('pcDone'));
    } catch (ex) { setBusy(false); setErr(ex); }
  };
  const Req = ({ ok, text }) => <li className={ok ? 'ok' : ''}><Icon name="check" size={16} />{text}</li>;
  return (
    <form id="pcForm" onSubmit={submit} noValidate>
      <div><h1>{t('pcTitle')}</h1><p className="muted" style={{ marginTop: 8 }}>{t('pcSub', { name: shortName(me.full_name) })}</p></div>
      <ErrBox error={err} />
      <div className="field"><label htmlFor="p0">{t('pcCurrent')}</label><input className="input" id="p0" type="password" autoComplete="current-password" autoFocus value={p0} onChange={(e) => setP0(e.target.value)} /></div>
      <div className="field"><label htmlFor="p1">{t('pcNew')}</label><input className="input" id="p1" type="password" autoComplete="new-password" aria-describedby="pReq" value={p1} onChange={(e) => setP1(e.target.value)} />
        <ul className="reqs" id="pReq"><Req ok={r1} text={t('pcR1')} /><Req ok={r2} text={t('pcR2')} /><Req ok={r3} text={t('pcR3')} /></ul></div>
      <div className="field"><label htmlFor="p2">{t('pcRepeat')}</label><input className="input" id="p2" type="password" autoComplete="new-password" aria-invalid={mismatch} value={p2} onChange={(e) => setP2(e.target.value)} />
        {mismatch && <p className="err"><Icon name="warn" size={16} />{t('pcMismatch')}</p>}</div>
      <button className="btn primary big" type="submit" id="pcBtn" disabled={!can || busy}>{busy ? <><Spinner />{t('saving')}</> : t('pcSave')}</button>
      <p className="small muted">{t('pcSkip')} <button type="button" className="link-btn" onClick={() => logout(false)}>{t('logout')}</button></p>
    </form>
  );
}

/* ================================================================
   10. Screens: dashboards, produce, stock, receipt
   ================================================================ */

const SERIES_COLORS = ['#7A4630', '#D9A066', '#4F2C73', '#2F6B3E', '#1F4A7A', '#A84A0C'];
const longToday = () => { const ymd = todayYmd(); return t('dateLong', { wd: t('wdLong')[weekdayOf(ymd)], d: fday(ymd) }); };

// Banner about low stock
function LowAlert({ low, canReceipt }) {
  if (!low.length) return null;
  let text;
  if (low.length === 1) {
    const x = low[0];
    if (x.level === 'out') text = <strong className="inline">{t('alertOut', { name: pname(x) })}</strong>;
    else text = <><strong className="inline">{t('alertLow1', { name: pname(x) })}</strong> {t('alertLow1t', { qty: fq(x.qty, x.unit), min: fq(x.min_qty, x.unit) })}{x.days_left != null && t('alertLowDays', { d: x.days_left })}</>;
  } else {
    text = <><strong className="inline">{t('alertLowMany', { n: low.length })}</strong> {low.map((x) => `${pname(x)} — ${fq(x.qty, x.unit)}`).join(', ')}</>;
  }
  return <Alert kind="warn" inline action={canReceipt ? <a href="#/receipt">{t('btnReceipt')} →</a> : null}>{text}</Alert>;
}

// Stock rows with the chocolate meter
function StockRowsMini({ items, head = true }) {
  const cols = { gridTemplateColumns: 'minmax(120px,1.3fr) minmax(110px,1.6fr) minmax(76px,.8fr) minmax(56px,.5fr)' };
  return (
    <div className="tbl">
      {head && <div className="th" style={cols}><span>{t('colName')}</span><span>{t('colLevel')}</span><span className="right">{t('colQty')}</span><span className="right">{t('colDays')}</span></div>}
      {items.map((m) => (
        <div className="tr" style={cols} key={m.product_id}>
          <div className="name"><b>{pname(m)}</b><span>{m.code} · {t('min')} {fq(m.min_qty, m.unit)}</span></div>
          <div className="m-full"><Meter qty={m.qty} min={m.min_qty} target={m.target_qty} level={m.level} /></div>
          <div className="right" title={fx(m.qty, m.unit)}><div className="mono" style={{ fontWeight: 600, fontSize: 14 }}>{fq(m.qty, m.unit)}</div><LowTag level={m.level} />
            {m.days_left != null && <span className="m-only xs muted">{t('days', { n: m.days_left })}</span>}</div>
          <div className="right mono small m-hide" style={{ fontWeight: 600, color: m.days_left != null && m.days_left <= 3 ? 'var(--low)' : 'var(--ink)' }}>{m.days_left != null ? t('days', { n: m.days_left }) : '—'}</div>
        </div>
      ))}
    </div>
  );
}

function CapacityCard({ caps }) {
  return (
    <section className="card" aria-labelledby="cap-h">
      <div className="card-head" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <h2 id="cap-h">{t('capTitle')}</h2>
        <p className="small muted" style={{ margin: 0, display: 'flex', gap: 6 }}><Icon name="info" size={16} />{t('capNote')}</p>
      </div>
      {caps.length ? caps.map((c, i) => (
        <div className="cap" key={c.product.id}>
          <span className="sw" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
          <div className="nm"><b>{pname(c.product)}</b><span>{c.limiting ? <>{t('capLim')}: <strong>{pname(c.limiting)}</strong></> : t('recipeV', { v: c.recipe_version })}</span></div>
          <div className="mx"><small>{t('capMax')}</small><b>{grp(c.max_possible)} <span>{t('pcs')}</span></b></div>
        </div>
      )) : <p className="muted small">{t('capNoRecipe')}</p>}
    </section>
  );
}

function Chart7d({ p7 }) {
  const days = p7.days || [];
  const series = (p7.series || []).filter((s) => s.total > 0 || (p7.series || []).length <= 3);
  const totals = days.map((_, i) => series.reduce((a, s) => a + (s.values[i] || 0), 0));
  const maxV = Math.max(...totals, 1);
  const step = maxV <= 10 ? 5 : maxV <= 50 ? 25 : maxV <= 100 ? 50 : Math.pow(10, Math.floor(Math.log10(maxV)));
  const top = Math.ceil(maxV / step) * step;
  const today = todayYmd();
  const color = (i) => SERIES_COLORS[i % SERIES_COLORS.length];
  return (
    <section className="card" aria-labelledby="ch-h">
      <div className="card-head">
        <h2 id="ch-h">{t('chartTitle')} <span className="muted" style={{ fontWeight: 500 }}>· {t('pcs')}</span></h2>
        <div className="legend">{series.map((s, i) => <span key={s.product.id}><i style={{ background: color(i) }} />{pname(s.product)}</span>)}</div>
      </div>
      <div className="chart">
        <div className="yax" aria-hidden="true"><span>{top}</span><span>{top / 2}</span><span>0</span></div>
        <div className="plot" role="img" aria-label={`${t('chartTitle')}: ${t('total')} ${p7.total} ${t('pcs')}`}>
          <div className="gl" style={{ top: 0 }} /><div className="gl" style={{ top: '50%' }} />
          {days.map((d, i) => (
            <div className="col" key={d} title={`${fday(d)} — ${series.map((s) => `${pname(s.product)}: ${s.values[i] || 0}`).join(', ')} (${t('total')} ${totals[i]})`}>
              {series.map((s, si) => (s.values[i] ? <i key={si} style={{ height: `${(s.values[i] / top) * 100}%`, background: color(si) }} /> : null))}
            </div>
          ))}
        </div>
        <div className="xax">{days.map((d) => <div key={d}><b style={d === today ? { color: 'var(--ink)' } : undefined}>{t('weekdays')[weekdayOf(d)]}</b>{fday(d).slice(0, 5)}</div>)}</div>
      </div>
      <details className="tv"><summary>{t('tableView')}</summary>
        <div style={{ overflowX: 'auto' }}><table className="mini-tbl"><thead><tr><th>{t('colDay')}</th>{series.map((s) => <th className="n" key={s.product.id}>{pname(s.product)}</th>)}<th className="n">{t('total')}</th></tr></thead>
          <tbody>{days.map((d, i) => <tr key={d}><td>{fday(d)}</td>{series.map((s) => <td className="n" key={s.product.id}>{s.values[i] || 0}</td>)}<td className="n">{totals[i]}</td></tr>)}</tbody></table></div>
      </details>
    </section>
  );
}

function DocRows({ docs }) {
  if (!docs.length) return <p className="muted small">{t('noDocs')}</p>;
  return docs.map((d) => {
    const struck = !!d.reversed_by;
    const note = d.reverses ? t('reverses', { num: d.reverses.number }) : d.reversed_by ? t('reversedBy', { num: d.reversed_by.number }) : '';
    return (
      <a className="doc-row" href={`#/ledger?open=${d.id}`} key={d.id}>
        <span className={'code' + (struck ? ' strike' : '')}>{d.number}</span>
        <span style={{ minWidth: 0 }}>
          <span className="row" style={{ gap: 8 }}><DocBadge type={d.doc_type} />{note && <span className="xs muted">{note}</span>}</span>
          <span className={'sum' + (struck ? ' strike' : '')} style={{ marginTop: 4 }}>{docSummary(d)}</span>
        </span>
        <span className="small muted who">{shortName(d.created_by.full_name)}</span>
        <span className="small mono muted">{isToday(d.created_at) ? ftime(d.created_at) : fdate(d.created_at)}</span>
      </a>
    );
  });
}

/* ---------- Dashboard (admin) ---------- */
function DashboardPage() {
  const { setLowCount } = useApp();
  const st = useLoad(async () => {
    const [dash, stock, receipts] = await Promise.all([
      api('GET', '/dashboard'), api('GET', '/stock'), api('GET', '/documents', { query: { doc_type: 'receipt', size: 1 } }),
    ]);
    setLowCount(stock.filter((s) => s.kind === 'raw' && s.level !== 'ok').length);
    return { dash, stock, receipts };
  });
  return <Async state={st}>{({ dash, stock, receipts }) => {
    const raw = stock.filter((s) => s.kind === 'raw'); const fg = stock.filter((s) => s.kind === 'finished');
    const s1 = raw.length > 0 && fg.length > 0; const s2 = dash.capacity.length > 0; const s3 = receipts.total > 0;
    if (!(s1 && s2 && s3)) return <Onboarding s1={s1} s2={s2} s3={s3} />;
    const low = dash.low_stock; const lowRaw = low.filter((x) => x.kind === 'raw');
    const today = dash.today; const nDays = (dash.production_7d.days || []).length || 7;
    return (<>
      <PageHead pre={longToday()} title={t('dashTitle')}>
        <a className="btn" href="#/receipt"><Icon name="receipt" size={18} />{t('btnReceipt')}</a>
        <a className="btn primary" href="#/produce"><Icon name="factory" size={18} />{t('btnProduce')}</a>
      </PageHead>
      <LowAlert low={low} canReceipt />
      <section className="kpis" aria-label="KPI">
        <div className="kpi"><div className="k-l">{t('k1')}</div><div className="k-v">{grp(today.produced_total)} <span>{t('pcs')}</span></div>
          <div className="k-s">{today.produced.length ? today.produced.map((p) => `${pname(p.product)}: ${p.qty}`).join(' · ') : t('k1none')}</div></div>
        <div className="kpi"><div className="k-l">{t('k2')}</div><div className="k-v" style={{ color: lowRaw.length ? 'var(--low)' : 'var(--ink)' }}>{lowRaw.length}</div>
          <div className="k-s">{lowRaw.length ? t('k2s', { n: raw.length }) + ' · ' + lowRaw.map(pname).join(', ') : t('k2none')}</div></div>
        <div className="kpi"><div className="k-l">{t('k3')}</div><div className="k-v">{today.documents_count}</div><div className="k-s">{t('k3s')}</div></div>
        <div className="kpi"><div className="k-l">{t('k4')}</div><div className="k-v">{grp(dash.production_7d.total)} <span>{t('pcs')}</span></div>
          <div className="k-s">{t('k4s', { n: Math.floor(dash.production_7d.total / nDays) })}</div></div>
      </section>
      <div className="grid2">
        <section className="card" aria-labelledby="raw-h"><div className="card-head"><h2 id="raw-h">{t('rawTitle')}</h2><a href="#/stock">{t('rawAll')} →</a></div><StockRowsMini items={raw} /></section>
        <div className="stack">
          <CapacityCard caps={dash.capacity} />
          <section className="card" aria-labelledby="fg-h"><h2 id="fg-h" style={{ marginBottom: 8 }}>{t('fgTitle')}</h2>
            {fg.map((f) => (
              <div key={f.product_id} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,1.2fr) minmax(90px,1.4fr) auto', gap: 16, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--line2)' }}>
                <div className="name"><b>{pname(f)}</b><span>{f.code} · {t('min')} {fq(f.min_qty, f.unit)}</span></div>
                <Meter qty={f.qty} min={f.min_qty} target={f.target_qty} level={f.level} />
                <div className="mono" style={{ fontWeight: 600 }}>{fq(f.qty, f.unit)}</div>
              </div>
            ))}
          </section>
        </div>
      </div>
      <Chart7d p7={dash.production_7d} />
      <section className="card" aria-labelledby="doc-h"><div className="card-head"><h2 id="doc-h">{t('docsTitle')}</h2><a href="#/ledger">{t('docsAll')} →</a></div><DocRows docs={dash.recent_documents} /></section>
    </>);
  }}</Async>;
}

function Onboarding({ s1, s2, s3 }) {
  const done = [s1, s2, s3].filter(Boolean).length;
  const Step = ({ n, ok, prevOk, title, text, btn, href, wait }) => (
    <li className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, ...(!ok && prevOk ? { border: '2px solid var(--cocoa)' } : {}) }}>
      <div className="row"><span className="ava" style={{ background: ok ? 'var(--pos)' : prevOk ? 'var(--cocoa)' : '#CDBBAA' }}>{ok ? <Icon name="check" size={18} /> : n}</span>
        {ok ? <span className="badge b-ok">{t('obDone')}</span> : prevOk ? <span className="badge b-warn">{t('obNow')}</span> : null}</div>
      <h2>{title}</h2><p className="muted" style={{ margin: 0 }}>{text}</p>
      {!ok && (prevOk ? <a className="btn primary" href={href}>{btn}</a> : <span className="small muted row" style={{ gap: 6 }}><Icon name="lock" size={16} />{wait}</span>)}
    </li>
  );
  return (
    <div className="stack" style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center' }}>
        <div style={{ flex: '1 1 380px' }}><p className="pre mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>{t('obPre', { n: done })}</p>
          <h1>{t('obTitle')}</h1><p className="muted" style={{ fontSize: 16 }}>{t('obSub')}</p></div>
        <div className="auth-art" style={{ flex: '0 1 320px', borderRadius: 22, padding: 24 }}>
          <div className="bar" style={{ width: '100%' }}>{Array.from({ length: 18 }, (_, i) => <i key={i} className={i < done * 6 ? '' : 'gap'} />)}</div></div>
      </div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(280px,100%),1fr))', gap: 16 }}>
        <Step n={1} ok={s1} prevOk title={t('ob1')} text={t('ob1t')} btn={t('ob1b')} href="#/products?new=1" />
        <Step n={2} ok={s2} prevOk={s1} title={t('ob2')} text={t('ob2t')} btn={t('ob2b')} href="#/recipes" wait={t('ob2w')} />
        <Step n={3} ok={s3} prevOk={s1 && s2} title={t('ob3')} text={t('ob3t')} btn={t('ob3b')} href="#/receipt" wait={t('ob3w')} />
      </ol>
    </div>
  );
}

/* ---------- Warehouse panel (omborchi) ---------- */
function WarehousePage() {
  const { setLowCount } = useApp();
  const st = useLoad(async () => {
    const today = todayYmd();
    const q = (doc_type, size, onlyToday) => api('GET', '/documents', { query: { doc_type, size, ...(onlyToday ? { date_from: today, date_to: today } : {}) } });
    const [dash, stock, lastIn, todayIn, todayAdj, todayScr] = await Promise.all([
      api('GET', '/dashboard'), api('GET', '/stock'), q('receipt', 4), q('receipt', 100, true), q('adjustment', 1, true), q('scrap', 1, true),
    ]);
    setLowCount(stock.filter((s) => s.kind === 'raw' && s.level !== 'ok').length);
    return { dash, stock, lastIn, todayIn, todayAdj, todayScr };
  });
  return <Async state={st}>{({ dash, stock, lastIn, todayIn, todayAdj, todayScr }) => {
    const raw = stock.filter((s) => s.kind === 'raw'); const fg = stock.filter((s) => s.kind === 'finished');
    const low = dash.low_stock;
    let inG = 0; const inNames = new Set();
    todayIn.items.forEach((d) => { if (!d.reversed_by) d.entries.forEach((e) => { if (e.product.unit === 'g') inG += e.qty_delta; inNames.add(pname(e.product)); }); });
    const inTxt = fq(inG, 'g').split(' ');
    return (<>
      <PageHead pre={longToday()} title={t('whTitle')}>
        <a className="btn" href="#/adjust"><Icon name="adjust" size={18} />{t('btnAdjust')}</a>
        <a className="btn primary" href="#/receipt"><Icon name="receipt" size={18} />{t('btnReceipt')}</a>
      </PageHead>
      <LowAlert low={low} canReceipt />
      <section className="kpis">
        <div className="kpi"><div className="k-l">{t('wk1')}</div><div className="k-v" style={{ color: low.length ? 'var(--low)' : 'var(--ink)' }}>{low.length}</div>
          <div className="k-s">{low.length ? low.map((x) => pname(x) + (x.days_left != null ? ' · ' + t('days', { n: x.days_left }) : '')).join(', ') : t('wk1s')}</div></div>
        <div className="kpi"><div className="k-l">{t('wk2')}</div><div className="k-v">{inTxt[0]} <span>{inTxt[1] || ''}</span></div>
          <div className="k-s">{t('wk2s', { n: todayIn.total })}{inNames.size ? ' · ' + [...inNames].join(', ') : ''}</div></div>
        <div className="kpi"><div className="k-l">{t('wk3')}</div><div className="k-v">{todayAdj.total} / {todayScr.total}</div><div className="k-s">{t('t_adjustment')} / {t('t_scrap')}</div></div>
        <div className="kpi"><div className="k-l">{t('wk4')}</div><div className="k-v">{stock.length}</div><div className="k-s">{t('wk4s', { r: raw.length, f: fg.length })}</div></div>
      </section>
      <div className="grid-side">
        <section className="card" aria-labelledby="z-h"><div className="card-head"><h2 id="z-h">{t('zTitle')}</h2><a href="#/stock">{t('rawAll')} →</a></div>
          <div className="tbl"><div className="sec" style={{ borderTop: 0 }}>{t('raw')}</div></div><StockRowsMini items={raw} />
          {fg.length > 0 && <><div className="tbl"><div className="sec">{t('finished')}</div></div><StockRowsMini items={fg} head={false} /></>}</section>
        <div className="stack">
          <section className="card" aria-labelledby="low-h"><h2 id="low-h" style={{ marginBottom: 12 }}>{t('lowTitle')}</h2>
            {low.length ? low.map((x) => (
              <div key={x.product_id} style={{ padding: 14, borderRadius: 14, background: 'var(--low-bg)', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="row" style={{ gap: 6, fontWeight: 700, color: 'var(--low-ink)' }}><Icon name="warn" size={16} />{pname(x)}</span>
                  <span className="mono small" title={fx(x.qty, x.unit)}>{fq(x.qty, x.unit)} / {t('min')} {fq(x.min_qty, x.unit)}</span></div>
                <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 12px', margin: 0, fontSize: 13 }}>
                  {x.days_left != null && <><dt className="muted">{t('colDays')}</dt><dd style={{ margin: 0 }}>{t('days', { n: x.days_left })}</dd></>}
                  <dt className="muted">{t('toTarget')}</dt><dd style={{ margin: 0 }} className="mono">{fq(Math.max(0, x.target_qty - x.qty), x.unit)}</dd></dl>
                {x.kind === 'raw' && <a className="btn sm primary" style={{ alignSelf: 'flex-start' }} href={`#/receipt?product=${x.product_id}`}>{t('btnReceipt')}</a>}
              </div>
            )) : <p className="muted small">{t('lowNone')}</p>}
          </section>
          <section className="card" aria-labelledby="in-h"><div className="card-head"><h2 id="in-h">{t('lastIn')}</h2><a href="#/ledger?doc_type=receipt">{t('ledgerLink')} →</a></div>
            {lastIn.items.length ? lastIn.items.map((d) => (
              <a key={d.id} className="doc-row" style={{ gridTemplateColumns: '1fr' }} href={`#/ledger?open=${d.id}`}>
                <span className="row" style={{ justifyContent: 'space-between' }}><span className={'code' + (d.reversed_by ? ' strike' : '')}>{d.number}</span><span className="xs muted mono">{fdt(d.created_at)}</span></span>
                <span className={'sum' + (d.reversed_by ? ' strike' : '')}>{docSummary(d)}</span>
                <span className="xs muted">{d.supplier_name ? d.supplier_name + ' · ' : ''}{shortName(d.created_by.full_name)}</span>
              </a>
            )) : <p className="muted small">{t('noDocs')}</p>}
          </section>
        </div>
      </div>
    </>);
  }}</Async>;
}

/* ---------- Produce ----------
   request_id rules (the server uses it to avoid double documents):
   - "Retry" after a network/server error sends the SAME request_id;
   - any change of product / qty / note makes a NEW request_id. */
function ProducePage({ params }) {
  const st = useLoad(() => api('GET', '/stock/capacity'));
  return <Async state={st}>{(caps) => <ProduceForm initialCaps={caps} params={params} />}</Async>;
}

function ProduceForm({ initialCaps, params }) {
  const { me, refreshLow } = useApp();
  const [caps, setCaps] = useState(initialCaps);
  const [pid, setPid] = useState(() => {
    const want = Number(params.product);
    return initialCaps.find((c) => c.product.id === want) ? want : initialCaps[0] && initialCaps[0].product.id;
  });
  const [qty, setQtyRaw] = useState('40');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState(null); // {kind:'conflict'|'recipe'|'error', ...}
  const [large, setLarge] = useState(false);
  const [done, setDone] = useState(null);
  const reqId = useRef(null);

  if (!caps.length) {
    return (<>
      <PageHead title={t('prTitle')} />
      <div className="card"><Empty title={t('noRecipes')} text={me.role === 'admin' ? t('noRecipesAdmin') : ''}>
        {me.role === 'admin' && <a className="btn primary" href="#/recipes">{t('nav_recipes')}</a>}</Empty></div>
    </>);
  }

  const cap = caps.find((c) => c.product.id === pid) || caps[0];
  const valid = /^\d+$/.test(qty) && parseInt(qty, 10) >= 1 && parseInt(qty, 10) <= 1000000;
  const n = valid ? parseInt(qty, 10) : 0;
  const lines = cap.lines.map((l) => {
    const need = l.qty_per_unit * n; const have = l.stock_qty;
    return { ...l, need, have, after: have - need, ok: have - need >= 0, unit: l.raw_product.unit };
  });
  const anyShort = lines.some((l) => !l.ok);

  const changed = () => { reqId.current = null; };
  const setQty = (v) => { setQtyRaw(String(Math.max(0, v))); changed(); };

  async function reloadCaps() {
    try { const c = await api('GET', '/stock/capacity'); setCaps(c); return c; } catch (e) { return caps; }
  }

  async function submit(isRetry) {
    if (sending) return;
    if (!isRetry || !reqId.current) reqId.current = uuid();
    setSending(true); setBanner(null);
    try {
      const doc = await api('POST', '/documents/productions', { body: { request_id: reqId.current, product_id: cap.product.id, qty: n, recipe_version_id: cap.recipe_version_id, note: note.trim() || null } });
      reqId.current = null; setNote('');
      setDone({ doc, product: cap.product, n });
      await reloadCaps(); refreshLow();
    } catch (err) {
      if (err.code === 'INSUFFICIENT_STOCK') {
        reqId.current = null; await reloadCaps();
        setBanner({ kind: 'conflict', max: err.data ? err.data.max_possible : 0, shortages: err.data ? err.data.shortages : [] });
      } else if (err.code === 'RECIPE_VERSION_CHANGED') {
        reqId.current = null; const from = cap.recipe_version; await reloadCaps();
        setBanner({ kind: 'recipe', from, to: err.data ? err.data.version : '?' });
      } else if (err.network || err.retryable) {
        setBanner({ kind: 'error', retry: true }); // keep request_id for a safe retry
      } else {
        reqId.current = null; setBanner({ kind: 'error', message: err.message });
      }
    }
    setSending(false);
  }

  function onGo() {
    if (cap.max_possible > 0 && n > LARGE_QTY_RATIO * cap.max_possible) setLarge(true);
    else submit(false);
  }

  let bannerEl = null;
  if (banner && banner.kind === 'recipe') {
    bannerEl = <Alert kind="info" inline action={<button className="btn sm" onClick={() => setBanner(null)}>{t('ok')}</button>}>
      <strong className="inline">{t('recipeChanged', { a: banner.from, b: banner.to })}</strong> {t('recipeChangedT')}</Alert>;
  } else if (banner && banner.kind === 'conflict') {
    bannerEl = <Alert kind="warn" title={banner.max > 0 ? t('conflictTitle', { m: banner.max }) : t('zeroMax')}
      action={<div className="row">{banner.max > 0 && <button className="btn sm primary" id="bLower" onClick={() => { setQty(banner.max); setBanner(null); }}>{t('lowerTo', { m: banner.max })}</button>}
        <button className="btn sm" onClick={() => setBanner(null)}>{t('close')}</button></div>}>
      {t('conflictText')}
      {(banner.shortages || []).map((s) => <div key={s.product.id} className="small mono" style={{ marginTop: 4 }}>{pname(s.product)}: {t('shortLine', { need: fx(s.need, s.product.unit), have: fx(s.have, s.product.unit), s: fx(s.missing, s.product.unit) })}</div>)}
    </Alert>;
  } else if (banner) {
    bannerEl = <Alert kind="err" title={banner.retry ? t('noAnswer') : t('errTitle')}
      action={banner.retry ? <button className="btn sm" id="bRetry" onClick={() => submit(true)}>{t('retry')}</button> : <button className="btn sm" onClick={() => setBanner(null)}>{t('close')}</button>}>
      {banner.retry ? t('retrySafe') : banner.message}</Alert>;
  }

  let btn;
  if (sending) btn = <button className="btn big" disabled aria-busy="true"><Spinner />{t('sending')}</button>;
  else if (!valid) btn = <button className="btn big" disabled>{t('enterQty')}</button>;
  else if (anyShort) {
    btn = <><button className="btn big" disabled>{t('notEnough')}</button>
      <div className="alt">{cap.max_possible > 0 && <button className="btn" onClick={() => setQty(cap.max_possible)}>{t('lowerTo', { m: cap.max_possible })}</button>}
        {me.role !== 'operator' && <a className="btn" href="#/receipt">{t('btnReceipt')}</a>}</div></>;
  } else btn = <button className="btn big" id="go" onClick={onGo}><Icon name="factory" />{t('produceN', { n: grp(n) })}</button>;

  return (<>
    <PageHead title={t('prTitle')} sub={t('prLead')} />
    <div id="prBanner">{bannerEl}</div>
    <div className="grid-side">
      <section className="card stack" style={{ gap: 22 }} aria-label={t('prTitle')}>
        <fieldset><legend><span className="step-n">01</span> · {t('prS1')}</legend>
          <div className="prod-pick" id="pick">
            {caps.map((c, i) => (
              <button type="button" key={c.product.id} aria-pressed={c.product.id === cap.product.id} disabled={sending}
                onClick={() => { setPid(c.product.id); changed(); setBanner(null); }}>
                <span className="sw" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                <span style={{ flex: 1, minWidth: 0 }}><b>{pname(c.product)}</b><small>{t('recipeV', { v: c.recipe_version })} · {t('capMax')} {grp(c.max_possible)}</small></span>
                {c.product.id === cap.product.id && <Icon name="check" />}
              </button>
            ))}
          </div></fieldset>
        <div>
          <label htmlFor="qty" style={{ fontWeight: 600, fontSize: 14 }}><span className="step-n">02</span> · {t('prS2')} ({t('pcs')})</label>
          <div className="qty-box">
            <button type="button" className="icon-btn" aria-label={t('dec')} disabled={sending} onClick={() => setQty(Math.max(1, n - 1))}><Icon name="minus" size={24} /></button>
            <input className="input" id="qty" inputMode="numeric" autoComplete="off" value={qty} disabled={sending} aria-invalid={!valid} aria-describedby="qtyHelp"
              onChange={(e) => { setQtyRaw(e.target.value.replace(/[^\d]/g, '')); changed(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && valid && !anyShort) onGo(); }} />
            <button type="button" className="icon-btn" aria-label={t('inc')} disabled={sending} onClick={() => setQty(n + 1)}><Icon name="plus" size={24} /></button>
          </div>
          <div className="quick">
            {[10, 50, 100].map((v) => <button type="button" key={v} disabled={sending} onClick={() => setQty(v)}>{v}</button>)}
            <button type="button" disabled={sending} onClick={() => setQty(cap.max_possible)}>{t('maxBtn')} · {grp(cap.max_possible)}</button>
          </div>
          <p id="qtyHelp" className="small" style={{ margin: '10px 0 0' }}>
            {valid ? <>{t('limiting')}: <strong>{cap.limiting ? pname(cap.limiting) : '—'}</strong></>
              : <span className="neg" style={{ fontWeight: 600, display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="warn" size={16} />{t('invalidQty')}</span>}
          </p>
        </div>
        <div className="field"><label htmlFor="note">{t('note')} <span className="opt">{t('optional')}</span></label>
          <textarea className="input" id="note" rows={2} maxLength={1000} placeholder={t('notePh')} value={note} disabled={sending} onChange={(e) => { setNote(e.target.value); changed(); }} /></div>
      </section>
      <section className="stack" aria-labelledby="check-h">
        <div className="card">
          <div className="card-head"><h2 id="check-h">{t('check')}</h2><span className="small muted" id="forN">{t('forN', { n })} · {t('recipeV', { v: cap.recipe_version })}</span></div>
          {lines.map((l) => (
            <div className="need-line" key={l.raw_product.id}>
              <div className="top">
                <span><b>{pname(l.raw_product)}</b> <span className="muted small">· {t('per1')}: {fx(l.qty_per_unit, l.unit)}</span></span>
                <span className="small" title={`${fx(l.need, l.unit)} / ${fx(l.have, l.unit)}`}><span className="muted">{t('need')}</span> <b>{l.ok ? fq(l.need, l.unit) : fx(l.need, l.unit)}</b> <span className="muted">/ {t('have')} {l.ok ? fq(l.have, l.unit) : fx(l.have, l.unit)}</span></span>
              </div>
              <div className="need-bar" aria-hidden="true">
                {l.ok ? <i className="use" style={{ width: `${l.have > 0 ? Math.min(100, (l.need / l.have) * 100) : 0}%` }} />
                  : <><i className="use" style={{ width: `${l.need ? (l.have / l.need) * 100 : 0}%` }} /><i className="short" style={{ flex: 1 }} /></>}
              </div>
              {l.ok ? <div className="st pos"><Icon name="check" size={16} />{t('enoughAfter', { q: fq(l.after, l.unit) })}</div>
                : <div className="st neg"><Icon name="warn" size={16} />{t('shortLine', { need: fx(l.need, l.unit), have: fx(l.have, l.unit), s: fx(l.need - l.have, l.unit) })}</div>}
            </div>
          ))}
        </div>
        <div className="result-box" id="result">
          <div className="small" style={{ color: '#CDBBAA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{t('result')}</div>
          <div className="mvs">
            {lines.map((l) => <div key={l.raw_product.id}><span>{pname(l.raw_product)}</span><b style={{ color: '#F0A49A' }}>{fx(-l.need, l.unit)}</b></div>)}
            <div><span>{pname(cap.product)}</span><b style={{ color: '#9FD3A8' }}>+{grp(n)} {t('pcs')}</b></div>
          </div>
          {btn}
        </div>
      </section>
    </div>

    {large && (
      <Layer onClose={() => setLarge(false)}>
        <span className="badge b-warn" style={{ alignSelf: 'flex-start' }}>{t('largePct', { x: Math.round((n / cap.max_possible) * 100) })}</span>
        <h2>{t('largeTitle')}</h2><p>{t('largeText', { n: grp(n), p: pname(cap.product) })}</p>
        <div className="moves">{lines.map((l) => <div className="mv" key={l.raw_product.id}><span>{pname(l.raw_product)}</span><b className="neg">{fx(-l.need, l.unit)}</b></div>)}
          <div className="mv"><span>{pname(cap.product)}</span><b className="pos">+{grp(n)} {t('pcs')}</b></div></div>
        <div className="foot"><button className="btn" onClick={() => setLarge(false)}>{t('cancel')}</button>
          <button className="btn primary" id="lgYes" data-autofocus onClick={() => { setLarge(false); submit(false); }}>{t('yesProduce')}</button></div>
      </Layer>
    )}
    {done && (
      <Layer onClose={() => setDone(null)}>
        <div className="done-bar" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={i} className={i === 7 ? 'new' : ''} />)}</div>
        <h2 style={{ textAlign: 'center' }}>{t('doneTitle', { num: done.doc.number })}</h2>
        <p style={{ textAlign: 'center' }}>{t('doneText', { n: grp(done.n), p: pname(done.product) })}</p>
        <div className="moves">{done.doc.entries.map((e) => (
          <div className="mv" key={e.product.id}><span>{pname(e.product)}</span><span><b className={e.qty_delta < 0 ? 'neg' : 'pos'}>{fx(e.qty_delta, e.product.unit, true)}</b> <span className="after">→ {fq(e.qty_after, e.product.unit)}</span></span></div>
        ))}</div>
        <div className="foot" style={{ justifyContent: 'center' }}>
          <a className="btn" href={`#/ledger?open=${done.doc.id}`}>{t('openDoc')}</a>
          <button className="btn primary" data-close data-autofocus onClick={() => setDone(null)}>{t('again')}</button>
        </div>
      </Layer>
    )}
  </>);
}

/* ---------- Stock ---------- */
function StockPage({ params }) {
  const { me, setLowCount } = useApp();
  const canHistory = me.role !== 'operator';
  const [f, setF] = useState({ kind: params.kind || '', low: params.low === '1', q: params.q || '' });
  const [open, setOpen] = useState({});
  const [hist, setHist] = useState({});
  const st = useLoad(async () => {
    const items = await api('GET', '/stock');
    setLowCount(items.filter((x) => x.kind === 'raw' && x.level !== 'ok').length);
    return items;
  });
  const upd = (patch) => { const nf = { ...f, ...patch }; setF(nf); setHashQuery({ kind: nf.kind, low: nf.low ? '1' : '', q: nf.q }); };

  async function toggle(pid) {
    const isOpen = !open[pid];
    setOpen((o) => ({ ...o, [pid]: isOpen }));
    if (isOpen && !hist[pid]) {
      try { const h = await api('GET', '/ledger', { query: { product_id: pid, size: 5 } }); setHist((x) => ({ ...x, [pid]: h.items })); } catch (e) { setHist((x) => ({ ...x, [pid]: [] })); }
    }
  }

  const cols = { gridTemplateColumns: `minmax(150px,1.4fr) minmax(130px,2fr) minmax(90px,.8fr) minmax(80px,.7fr) minmax(64px,.6fr)${canHistory ? ' 28px' : ''}`, cursor: canHistory ? 'pointer' : 'default' };
  const items = st.data || [];
  const lowN = items.filter((x) => x.level !== 'ok').length;
  const q = f.q.trim().toLowerCase();
  const list = items.filter((x) => (!f.kind || x.kind === f.kind) && (!f.low || x.level !== 'ok')
    && (!q || x.code.toLowerCase().includes(q) || x.name_uz.toLowerCase().includes(q) || x.name_ru.toLowerCase().includes(q)));

  // a plain function (not a component) so rows keep focus between renders
  const row = (m) => {
    const isOpen = !!open[m.product_id];
    const h = hist[m.product_id];
    return (<Fragment key={m.product_id}>
      <div className="tr" style={cols} {...(canHistory ? {
        role: 'button', tabIndex: 0, 'aria-expanded': isOpen, 'data-row': m.product_id, onClick: () => toggle(m.product_id),
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(m.product_id); } }
      } : {})}>
        <div className="name"><b>{pname(m)}</b><span>{m.code}</span></div>
        <div className="m-full"><Meter qty={m.qty} min={m.min_qty} target={m.target_qty} level={m.level} /></div>
        <div className="right" title={fx(m.qty, m.unit)}><div className="mono" style={{ fontWeight: 600, fontSize: 14 }}>{fq(m.qty, m.unit)}</div><LowTag level={m.level} />
          <span className="m-only xs muted">{t('min')} {fq(m.min_qty, m.unit)}{m.days_left != null ? ' · ' + t('days', { n: m.days_left }) : ''}</span></div>
        <div className="right mono small m-hide">{fq(m.min_qty, m.unit)}</div>
        <div className="right mono small m-hide" style={{ fontWeight: 600, color: m.days_left != null && m.days_left <= 3 ? 'var(--low)' : 'var(--ink)' }}>{m.days_left != null ? t('days', { n: m.days_left }) : '—'}</div>
        {canHistory && <span className="muted m-hide"><Icon name={isOpen ? 'chevU' : 'chevD'} size={18} /></span>}
      </div>
      {isOpen && (
        <div style={{ margin: '0 0 14px', padding: '14px 16px', borderRadius: 14, background: 'var(--bg)' }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}><strong className="small">{t('history', { name: pname(m) })}</strong>
            <a className="small" style={{ fontWeight: 600 }} href={`#/ledger?view=lines&product_id=${m.product_id}`}>{t('ledgerAll')}</a></div>
          {!h ? <Loading /> : !h.length ? <p className="muted small">{t('noHistory')}</p> : h.map((r) => {
            const struck = !!r.document.reversed_by;
            return (
              <div key={r.id} className="hist-row" style={{ display: 'grid', gridTemplateColumns: '130px 90px minmax(0,1fr) 100px 100px', gap: 12, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: 13, color: struck ? 'var(--muted)' : undefined }}>
                <span className="mono xs m-o3 m-sub">{fdt(r.created_at)}</span>
                <a className="mono m-o1" style={{ fontWeight: 600, textDecoration: struck ? 'line-through' : undefined }} href={`#/ledger?open=${r.document.id}`}>{r.document.number}</a>
                <span className="m-hide">{t('t_' + r.document.doc_type)}{struck ? ' · ' + t('stReversed').toLowerCase() : ''}</span>
                <span className={'mono right m-o2 ' + (struck ? '' : r.qty_delta < 0 ? 'neg' : 'pos')} style={{ fontWeight: 600, textDecoration: struck ? 'line-through' : undefined }} title={fx(r.qty_delta, m.unit, true)}>{fq(r.qty_delta, m.unit, true)}</span>
                <span className="mono right m-o4 m-sub" title={fx(r.qty_after, m.unit)}>{fq(r.qty_after, m.unit)}</span>
              </div>
            );
          })}
        </div>
      )}
    </Fragment>);
  };

  const raw = list.filter((x) => x.kind === 'raw'); const fin = list.filter((x) => x.kind === 'finished');
  return (<>
    <PageHead title={t('stTitle')} sub={st.data ? t('stSub', { n: items.length }) + (lowN ? t('stSubLow', { n: lowN }) : '') : ''}>
      {me.role !== 'operator' && <a className="btn primary" href="#/receipt"><Icon name="receipt" size={18} />{t('btnReceipt')}</a>}
    </PageHead>
    <div className="row" style={{ gap: 12 }}>
      <div className="seg" role="group" aria-label={t('kind')}>
        {[['', t('all')], ['raw', t('raw')], ['finished', t('finished')]].map(([k, l]) => <button type="button" key={k} aria-pressed={f.kind === k} onClick={() => upd({ kind: k })}>{l}</button>)}
      </div>
      <label className="check"><input type="checkbox" checked={f.low} onChange={(e) => upd({ low: e.target.checked })} />{t('onlyLow')}</label>
      <div className="search"><Icon name="search" size={18} /><input type="search" aria-label={t('search')} placeholder={t('searchPh')} value={f.q} onChange={(e) => upd({ q: e.target.value })} /></div>
    </div>
    <section className="card" style={{ padding: '8px 20px 12px' }} aria-label={t('stTitle')}>
      <Async state={st}>{() => (
        <div className="scroll-x"><div className="tbl">
          {!list.length ? <Empty title={t('nothingFound')} text={items.length ? t('nothingFoundT') : ''}>
            {items.length > 0 && <button className="btn" onClick={() => upd({ kind: '', low: false, q: '' })}>{t('clearFilters')}</button>}</Empty> : <>
            <div className="th" style={cols}><span>{t('colProduct')}</span><span>{t('colLevel')}</span><span className="right">{t('colQty')}</span><span className="right">{t('colMin')}</span><span className="right">{t('colEnough')}</span>{canHistory && <span />}</div>
            {raw.length > 0 && <><div className="sec">{t('raw')}</div>{raw.map(row)}</>}
            {fin.length > 0 && <><div className="sec">{t('finished')}</div>{fin.map(row)}</>}
          </>}
        </div></div>
      )}</Async>
    </section>
  </>);
}

/* ---------- Receipt (raw materials in) ---------- */
function ReceiptPage({ params }) {
  const [round, setRound] = useState(0); // after a save the form starts again with fresh stock
  const st = useLoad(() => api('GET', '/stock', { query: { kind: 'raw' } }), [round]);
  return <Async state={st}>{(raws) => <ReceiptForm key={round} raws={raws} params={round ? {} : params} onSaved={() => setRound((r) => r + 1)} />}</Async>;
}

let lineSeq = 0;
function ReceiptForm({ raws, params, onSaved }) {
  const { me, toast, refreshLow } = useApp();
  const byId = useMemo(() => Object.fromEntries(raws.map((r) => [r.product_id, r])), [raws]);
  const mkLine = (pid) => ({ key: ++lineSeq, pid: pid || '', q: { text: '', mode: pid && byId[pid] && byId[pid].unit === 'pcs' ? 'pcs' : 'kg' } });
  const [lines, setLines] = useState(() => [mkLine(byId[params.product] ? Number(params.product) : '')]);
  const [head, setHead] = useState({ no: '', date: '', sup: '', note: '' });
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null); // {error, retry}
  const reqId = useRef(null);
  const today = todayYmd();
  const changed = () => { reqId.current = null; };

  if (!raws.length) {
    return (<><PageHead title={t('rcTitle')} />
      <div className="card"><Empty title={t('noRaw')}>{me.role === 'admin' && <a className="btn primary" href="#/products?new=1">{t('ob1b')}</a>}</Empty></div></>);
  }

  const counts = {}; lines.forEach((l) => { if (l.pid) counts[l.pid] = (counts[l.pid] || 0) + 1; });
  const info = (l) => {
    const p = byId[l.pid]; const q = p ? readQty(l.q, p.unit) : null;
    let err = '';
    if (!l.pid) err = tried ? t('pickRaw') : '';
    else if (counts[l.pid] > 1) err = t('dupLine');
    else if (l.q.text.trim() !== '' && (q == null || q <= 0)) err = t('badQty');
    else if (tried && (q == null || q <= 0)) err = t('badQty');
    return { p, q, err };
  };
  const setLine = (key, patch) => { setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l))); changed(); };

  let totalG = 0; let totalPcs = 0; const fixedLow = [];
  lines.forEach((l) => { const { p, q } = info(l); if (p && q) { if (p.unit === 'g') totalG += q; else totalPcs += q; if (p.level !== 'ok' && p.qty + q >= p.min_qty) fixedLow.push(pname(p)); } });
  const totalTxt = [totalG ? fq(totalG, 'g', true) : '', totalPcs ? fq(totalPcs, 'pcs', true) : ''].filter(Boolean).join(' · ') || '—';

  async function submit(isRetry) {
    if (sending) return;
    setTried(true);
    const all = lines.map((l) => ({ l, ...info(l) }));
    if (head.date && head.date > today) { setMsg({ error: { message: t('futureDate') } }); return; }
    if (all.some((x) => x.err || !x.q || (!x.l.pid))) return;
    if (!isRetry || !reqId.current) reqId.current = uuid();
    setSending(true); setMsg(null);
    try {
      const doc = await api('POST', '/documents/receipts', {
        body: {
          request_id: reqId.current, lines: all.map((x) => ({ product_id: x.p.product_id, qty: x.q })),
          supplier_name: head.sup.trim() || null, supplier_doc_no: head.no.trim() || null, supplier_doc_date: head.date || null, note: head.note.trim() || null
        }
      });
      toast(<>{t('rcDone', { num: doc.number })} · <a href={`#/print/${doc.id}`}>{t('print')}</a> · <a href={`#/ledger?open=${doc.id}`}>{t('openDoc')}</a></>);
      refreshLow(); onSaved();
    } catch (err) {
      setSending(false);
      if (err.network || err.retryable) setMsg({ retry: true });
      else { reqId.current = null; setMsg({ error: err }); }
    }
  }

  const cols = { gridTemplateColumns: '32px minmax(170px,1.6fr) minmax(200px,1.4fr) minmax(150px,1.2fr) 44px', alignItems: 'start' };
  return (<>
    <PageHead pre={<><span className="mono" style={{ fontWeight: 600 }}>KRM</span> · {t('autoNumber')}</>} title={t('rcTitle')} />
    <div id="rcMsg">
      {msg && msg.retry && <Alert kind="err" title={t('noAnswer')} action={<button className="btn sm" id="rRetry" onClick={() => submit(true)}>{t('retry')}</button>}>{t('retrySafe')}</Alert>}
      {msg && msg.error && <ErrBox error={msg.error} />}
    </div>
    <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); submit(false); }}>
      <section className="card" aria-label={t('rcDetails')}><div className="form-grid">
        <div className="field"><label htmlFor="rNo">{t('supDocNo')} <span className="opt">{t('optional')}</span></label>
          <input className="input mono" id="rNo" maxLength={64} value={head.no} onChange={(e) => { setHead({ ...head, no: e.target.value }); changed(); }} /></div>
        <div className="field"><label htmlFor="rDate">{t('supDocDate')} <span className="opt">{t('optional')}</span></label>
          <input className="input" id="rDate" type="date" max={today} value={head.date} aria-describedby="rDateH" onChange={(e) => { setHead({ ...head, date: e.target.value }); changed(); }} />
          <span className="help" id="rDateH">{t('supDateHelp')}</span></div>
        <div className="field"><label htmlFor="rSup">{t('supplier')} <span className="opt">{t('optional')}</span></label>
          <input className="input" id="rSup" maxLength={200} value={head.sup} onChange={(e) => { setHead({ ...head, sup: e.target.value }); changed(); }} /></div>
        <div className="field"><label htmlFor="rNote">{t('note')} <span className="opt">{t('optional')}</span></label>
          <input className="input" id="rNote" maxLength={1000} placeholder={t('rcNotePh')} value={head.note} onChange={(e) => { setHead({ ...head, note: e.target.value }); changed(); }} /></div>
      </div></section>
      <section className="card" aria-labelledby="ln-h"><h2 id="ln-h" style={{ marginBottom: 6 }}>{t('lines')}</h2>
        <div className="scroll-x"><div className="tbl" id="rLines" style={{ minWidth: 680 }}>
          <div className="th" style={cols}><span>{t('colNo')}</span><span>{t('raw')}</span><span>{t('qty')}</span><span>{t('colNowAfter')}</span><span /></div>
          {lines.map((l, i) => {
            const { p, q, err } = info(l); const after = p && q ? p.qty + q : null;
            return (
              <div className="tr" style={cols} key={l.key} data-key={l.key}>
                <span className="mono muted m-hide" style={{ paddingTop: 14 }}>{i + 1}</span>
                <select className="input m-full" aria-label={`${t('raw')} ${i + 1}`} value={l.pid} aria-invalid={!!err && (!l.pid || err === t('dupLine'))}
                  onChange={(e) => {
                    const pid = e.target.value ? Number(e.target.value) : ''; const pp = byId[pid];
                    setLine(l.key, { pid, q: { ...l.q, mode: pp && pp.unit === 'pcs' ? 'pcs' : l.q.mode === 'pcs' ? 'kg' : l.q.mode } });
                  }}>
                  <option value="">{t('choose')}</option>
                  {raws.map((r) => <option key={r.product_id} value={r.product_id}>{pname(r)} · {r.code}</option>)}
                </select>
                <div className="field m-full" style={{ gap: 4 }}>
                  <QtyInput value={l.q} unit={p ? p.unit : 'g'} invalid={err === t('badQty')} ariaLabel={`${t('qty')} ${i + 1}`} onChange={(v) => setLine(l.key, { q: v })} />
                  {err ? <p className="err"><Icon name="warn" size={14} />{err}</p> : q && p && p.unit === 'g' && l.q.mode === 'kg' ? <span className="help mono">{fx(q, 'g')}</span> : null}
                </div>
                <span className="small" style={{ paddingTop: 12 }} title={p ? fx(p.qty, p.unit) + (after != null ? ' → ' + fx(after, p.unit) : '') : ''}>
                  {p ? <><span className="mono muted">{fq(p.qty, p.unit)}</span> → <strong className="mono">{after != null ? fq(after, p.unit) : '…'}</strong>
                    {p.level !== 'ok' && after != null && (after >= p.min_qty ? <> <span className="badge b-ok">{t('enoughWord')}</span></> : <> <span className="badge b-warn">{t('stillLow')}</span></>)}</>
                    : <span className="muted">—</span>}
                </span>
                <button type="button" className="icon-btn ghost" aria-label={t('removeLine', { n: i + 1 })} disabled={lines.length === 1}
                  onClick={() => { setLines((ls) => ls.filter((x) => x.key !== l.key)); changed(); }}><Icon name="trash" size={18} /></button>
              </div>
            );
          })}
        </div></div>
        <button type="button" className="btn" id="addLine" style={{ marginTop: 12 }} onClick={() => setLines((ls) => [...ls, mkLine()])}><Icon name="plus" size={18} />{t('addLine')}</button>
      </section>
      <section className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28 }}>
          <div><div className="xs muted">{t('sumLines')}</div><div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>{lines.length}</div></div>
          <div><div className="xs muted">{t('sumTotal')}</div><div className="mono" style={{ fontSize: 22, fontWeight: 600 }} title={fx(totalG, 'g')}>{totalTxt}</div></div>
          <div><div className="xs muted">{t('sumLow')}</div><div style={{ fontSize: 15, fontWeight: 600, paddingTop: 4 }}>{fixedLow.length ? fixedLow.join(', ') + ' → ' + t('enoughWord') : t('sumLowNone')}</div></div>
        </div>
        <div className="actions">
          <a className="btn" href={'#' + homeFor(me.role)}>{t('cancel')}</a>
          <button type="submit" className="btn primary" id="rSubmit" disabled={sending}>{sending ? <><Spinner />{t('saving')}</> : <><Icon name="check" size={18} />{t('rcConfirm')}</>}</button>
        </div>
      </section>
    </form>
  </>);
}

/* ================================================================
   11. Screens: adjustment, scrap, ledger with storno
   ================================================================ */

/* ---------- Adjustment (inventory count) ----------
   expected_qty = the stock the user saw. If it changed meanwhile, the server
   answers 409 STOCK_CHANGED and nothing is saved. */
function AdjustPage({ params }) {
  const st = useLoad(async () => { const [s] = await Promise.all([api('GET', '/stock'), loadMeta()]); return s; });
  return <Async state={st}>{(stock) => <AdjustForm initialStock={stock} params={params} />}</Async>;
}

function AdjustForm({ initialStock, params }) {
  const { refreshLow } = useApp();
  const [stock, setStock] = useState(initialStock);
  const byId = useMemo(() => Object.fromEntries(stock.map((s) => [s.product_id, s])), [stock]);
  const startPid = byId[params.product] ? Number(params.product) : '';
  const [pid, setPid] = useState(startPid);
  const [seen, setSeen] = useState(startPid ? byId[startPid].qty : null);
  const [cnt, setCnt] = useState({ text: '', mode: startPid && byId[startPid].unit === 'pcs' ? 'pcs' : 'kg' });
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [msg, setMsg] = useState(null); // {ok: doc} | {error} | {retry}
  const reqId = useRef(null);
  const cntRef = useRef(null);
  const changed = () => { reqId.current = null; };

  const p = byId[pid];
  const c = p ? readQty(cnt, p.unit) : null;
  const noteNeeded = (S.meta.note_required_for || []).includes(reason);
  const cntBad = cnt.text.trim() !== '' && c == null;

  async function submit(isRetry, expectedOverride) {
    if (sending) return;
    setTried(true);
    if (!p || c == null || !reason || (noteNeeded && !note.trim())) return;
    if (!isRetry || !reqId.current) reqId.current = uuid();
    const expected = expectedOverride != null ? expectedOverride : seen;
    setSending(true); setMsg(null);
    try {
      const doc = await api('POST', '/documents/adjustments', { body: { request_id: reqId.current, product_id: p.product_id, counted_qty: c, expected_qty: expected, reason, note: note.trim() || null } });
      setMsg({ ok: doc });
      const fresh = await api('GET', '/stock'); setStock(fresh);
      const np = fresh.find((x) => x.product_id === pid);
      setSeen(np ? np.qty : null); setCnt((v) => ({ ...v, text: '' })); setNote(''); setReason(''); setTried(false); reqId.current = null;
      refreshLow();
    } catch (err) {
      if (err.code === 'STOCK_CHANGED' && err.data) { reqId.current = null; setConflict(err.data); }
      else if (err.network || err.retryable) setMsg({ retry: true });
      else { reqId.current = null; setMsg({ error: err }); }
    }
    setSending(false);
  }

  let right;
  if (conflict) {
    const ld = conflict.last_document;
    right = (<>
      <Alert kind="warn" title={t('adConflictT')}>
        {ld ? t('adConflictS', { doc: `${ld.number} (${ftime(ld.created_at)})` }) : t('adConflictS0')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 10, fontSize: 12 }}>
          <span>{t('seen')}</span><span>{t('current')}</span><span>{t('newDiff')}</span>
          <span className="mono" style={{ fontSize: 15, textDecoration: 'line-through' }}>{fx(conflict.expected_qty, p.unit)}</span>
          <strong className="mono" style={{ fontSize: 15 }}>{fx(conflict.current_qty, p.unit)}</strong>
          <strong className="mono" style={{ fontSize: 15 }}>{conflict.new_diff === 0 ? '0' : fx(conflict.new_diff, p.unit, true)}</strong>
        </div>
      </Alert>
      <div className="row">
        <button className="btn" id="aRecount" style={{ flex: 1 }} onClick={() => { setSeen(conflict.current_qty); setConflict(null); setCnt({ ...cnt, text: '' }); changed(); setTimeout(() => cntRef.current && cntRef.current.querySelector('input').focus(), 30); }}>{t('recount')}</button>
        <button className="btn primary" id="aAccept" style={{ flex: 1 }} disabled={conflict.new_diff === 0}
          onClick={() => { const cur = conflict.current_qty; setSeen(cur); setConflict(null); changed(); submit(false, cur); }}>{t('acceptNew')}</button>
      </div>
    </>);
  } else if (!p || c == null) {
    right = (<><div className="mono" style={{ fontSize: 40, fontWeight: 600, color: 'var(--muted)' }}>—</div>
      <button className="btn big primary" disabled>{t('saveAdj')}</button></>);
  } else {
    const d = c - seen; const color = d > 0 ? 'var(--pos)' : d < 0 ? 'var(--neg)' : 'var(--muted)';
    right = (<>
      <div aria-live="polite">
        <div className="mono" style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', color }}>{d === 0 ? '0' : fx(d, p.unit, true)}</div>
        <div style={{ fontWeight: 600, color }}>{d > 0 ? t('diffMore') : d < 0 ? t('diffLess') : t('diffNone')}</div>
        <div className="row mono" style={{ marginTop: 6, fontSize: 15 }}><span className="muted">{fx(seen, p.unit)}</span><span aria-hidden="true">→</span><strong>{fx(c, p.unit)}</strong></div>
      </div>
      {sending ? <button className="btn big primary" disabled aria-busy="true"><Spinner />{t('saving')}</button>
        : d === 0 ? <button className="btn big primary" disabled>{t('noDiff')}</button>
          : <button className="btn big primary" id="aSave" onClick={() => submit(false)}><Icon name="check" />{t('saveAdj')}</button>}
    </>);
  }

  return (<>
    <PageHead pre={<><span className="mono" style={{ fontWeight: 600 }}>TZT</span> · {t('adPre')}</>} title={t('adTitle')} />
    <div id="adMsg">
      {msg && msg.ok && <Alert kind="ok" action={<a className="btn sm" href={`#/ledger?open=${msg.ok.id}`}>{t('openDoc')}</a>}>
        {t('adDone', { num: msg.ok.number, d: fx(msg.ok.entries[0].qty_delta, msg.ok.entries[0].product.unit, true), name: pname(msg.ok.entries[0].product) })}</Alert>}
      {msg && msg.retry && <Alert kind="err" title={t('noAnswer')} action={<button className="btn sm" onClick={() => submit(true)}>{t('retry')}</button>}>{t('retrySafe')}</Alert>}
      {msg && msg.error && <ErrBox error={msg.error} />}
    </div>
    <div className="grid-side">
      <section className="card stack" style={{ gap: 18 }} aria-label={t('adTitle')}>
        <div className="field"><label htmlFor="aMat">{t('product')} <span className="req">*</span></label>
          <select className="input" id="aMat" value={pid} onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : ''; const np = byId[v];
            setPid(v); setSeen(np ? np.qty : null); setCnt({ text: '', mode: np && np.unit === 'pcs' ? 'pcs' : 'kg' }); setConflict(null); changed();
            setTimeout(() => cntRef.current && cntRef.current.querySelector('input').focus(), 30);
          }}>
            <option value="">{t('choose')}</option>
            {['raw', 'finished'].map((k) => <optgroup key={k} label={t(k)}>{stock.filter((s) => s.kind === k).map((s) => <option key={s.product_id} value={s.product_id}>{pname(s)} · {s.code}</option>)}</optgroup>)}
          </select></div>
        <div className="row" style={{ justifyContent: 'space-between', padding: '12px 16px', borderRadius: 14, background: 'var(--bg)' }}>
          <span className="muted small">{t('sysQty')}</span><span className="mono" style={{ fontWeight: 600, fontSize: 18 }}>{p ? fx(seen, p.unit) : '—'}</span></div>
        <div className="field" ref={cntRef}><label htmlFor="aCnt">{t('counted')} <span className="req">*</span></label>
          <QtyInput id="aCnt" value={cnt} unit={p ? p.unit : 'g'} disabled={!p} invalid={cntBad} onChange={(v) => { setCnt(v); changed(); }} />
          {(cntBad || (tried && p && c == null)) && <p className="err"><Icon name="warn" size={14} />{t('badQty')}</p>}</div>
        <div className="field"><label htmlFor="aWhy">{t('reason')} <span className="req">*</span></label>
          <select className="input" id="aWhy" value={reason} aria-invalid={tried && !reason} onChange={(e) => { setReason(e.target.value); changed(); }}>
            <option value="">{t('choose')}</option>
            {S.meta.adjustment_reasons.map((r) => <option key={r.code} value={r.code}>{reasonLabel(r)}</option>)}
          </select>
          {tried && !reason && <p className="err"><Icon name="warn" size={14} />{t('reasonRequired')}</p>}</div>
        <div className="field"><label htmlFor="aNote">{t('note')} {noteNeeded ? <span className="req">*</span> : <span className="opt">{t('optional')}</span>}</label>
          <textarea className="input" id="aNote" rows={2} maxLength={1000} placeholder={t('adNotePh')} value={note} aria-invalid={tried && noteNeeded && !note.trim()} onChange={(e) => { setNote(e.target.value); changed(); }} />
          {tried && noteNeeded && !note.trim() && <p className="err"><Icon name="warn" size={14} />{t('noteRequiredOther')}</p>}</div>
      </section>
      <section className="card stack" aria-labelledby="d-h"><h2 id="d-h">{t('diffTitle')}</h2><div id="aDiff" className="stack">{right}</div></section>
    </div>
  </>);
}

/* ---------- Scrap ---------- */
function ScrapPage({ params }) {
  const st = useLoad(async () => { const [s] = await Promise.all([api('GET', '/stock'), loadMeta()]); return s; });
  return <Async state={st}>{(stock) => <ScrapForm initialStock={stock} params={params} />}</Async>;
}

function ScrapForm({ initialStock, params }) {
  const { me, refreshLow } = useApp();
  const isOp = me.role === 'operator';
  const [list, setList] = useState(initialStock);
  const [kind, setKind] = useState(() => {
    let k = isOp ? 'finished' : (params.kind || 'raw');
    if (!initialStock.some((x) => x.kind === k) && !isOp) k = k === 'raw' ? 'finished' : 'raw';
    return k;
  });
  const [pid, setPid] = useState(() => { const w = Number(params.product); return initialStock.some((x) => x.product_id === w) ? w : null; });
  const [q, setQ] = useState({ text: '', mode: 'kg' });
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null);
  const reqId = useRef(null);
  const changed = () => { reqId.current = null; };

  const items = list.filter((x) => x.kind === kind);
  const p = list.find((x) => x.product_id === pid && x.kind === kind);
  const reasons = kind === 'raw' ? S.meta.scrap_reasons_raw : S.meta.scrap_reasons_finished;
  const qty = p ? readQty(q, p.unit) : null;
  const noteNeeded = (S.meta.note_required_for || []).includes(reason);
  let qErr = '';
  if (p && q.text.trim() !== '' && (qty == null || qty <= 0)) qErr = t('badQty');
  else if (p && qty != null && qty > p.qty) qErr = t('moreThanStock', { q: fx(p.qty, p.unit) });
  else if (tried && p && (qty == null || qty <= 0)) qErr = t('badQty');
  const ok = p && qty && qty > 0 && qty <= p.qty;
  let blocked = '';
  if (!p) blocked = t('pickProduct'); else if (!ok) blocked = t('enterQty'); else if (!reason) blocked = t('pickReason'); else if (noteNeeded && !note.trim()) blocked = t('noteRequiredOther');
  const r = reasons.find((x) => x.code === reason);

  async function submit(isRetry) {
    if (sending) return;
    setTried(true);
    if (blocked) return;
    if (!isRetry || !reqId.current) reqId.current = uuid();
    setSending(true); setMsg(null);
    try {
      const doc = await api('POST', '/documents/scraps', { body: { request_id: reqId.current, product_id: p.product_id, qty, reason, note: note.trim() || null } });
      setMsg({ ok: doc, q: qty, p });
      setList(await api('GET', '/stock'));
      setQ((v) => ({ ...v, text: '' })); setReason(''); setNote(''); setTried(false); reqId.current = null;
      refreshLow();
    } catch (err) {
      if (err.network || err.retryable) setMsg({ retry: true });
      else {
        reqId.current = null; setMsg({ error: err });
        if (err.code === 'INSUFFICIENT_STOCK' || err.code === 'NEGATIVE_BALANCE') { try { setList(await api('GET', '/stock')); } catch (e) { /* ignore */ } }
      }
    }
    setSending(false);
  }

  return (<>
    <PageHead pre={<><span className="mono" style={{ fontWeight: 600 }}>BRK</span> · {t('autoNumber')}</>} title={t('scTitle')} />
    <div id="scMsg">
      {msg && msg.ok && <Alert kind="ok" action={<a className="btn sm" href={`#/ledger?open=${msg.ok.id}`}>{t('openDoc')}</a>}>{t('scDone', { num: msg.ok.number, q: fx(-msg.q, msg.p.unit), name: pname(msg.p) })}</Alert>}
      {msg && msg.retry && <Alert kind="err" title={t('noAnswer')} action={<button className="btn sm" onClick={() => submit(true)}>{t('retry')}</button>}>{t('retrySafe')}</Alert>}
      {msg && msg.error && <ErrBox error={msg.error} />}
    </div>
    <div className="grid-side">
      <form className="card stack" style={{ gap: 20 }} noValidate onSubmit={(e) => { e.preventDefault(); submit(false); }}>
        {!isOp && <div className="seg" role="group" aria-label={t('kind')} id="scKind" style={{ alignSelf: 'flex-start' }}>
          {['raw', 'finished'].map((k) => <button type="button" key={k} aria-pressed={kind === k}
            onClick={() => { if (k !== kind) { setKind(k); setPid(null); setReason(''); setQ({ text: '', mode: 'kg' }); changed(); } }}>{t(k)}</button>)}
        </div>}
        <fieldset><legend>{t(kind)}</legend>
          <div id="scItems" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10, marginTop: 10 }}>
            {items.length ? items.map((i) => (
              <label key={i.product_id} style={{
                display: 'flex', gap: 12, alignItems: 'center', minHeight: 60, padding: '10px 14px', borderRadius: 14, cursor: 'pointer',
                ...(i.product_id === pid ? { border: '2px solid var(--cocoa)', background: '#FBF5EE' } : { border: '1px solid var(--line)', background: 'var(--card)' })
              }}>
                <input type="radio" name="scItem" className="cb" value={i.product_id} checked={i.product_id === pid} disabled={i.qty <= 0}
                  onChange={() => { setPid(i.product_id); setQ((v) => ({ ...v, mode: i.unit === 'pcs' ? 'pcs' : v.mode === 'pcs' ? 'kg' : v.mode })); changed(); }} />
                <span><b style={{ display: 'block', fontSize: 14 }}>{pname(i)}</b><span className="xs muted">{t('inStock', { q: fq(i.qty, i.unit) })}</span></span>
              </label>
            )) : <p className="muted small">{t('nothingFound')}</p>}
          </div></fieldset>
        <div className="field"><label htmlFor="sQty">{t('qty')} <span className="req">*</span></label>
          <QtyInput id="sQty" value={q} unit={p ? p.unit : 'g'} disabled={!p} invalid={!!qErr} onChange={(v) => { setQ(v); changed(); }} />
          {qErr && <p className="err"><Icon name="warn" size={14} />{qErr}</p>}</div>
        <fieldset><legend>{t('reason')} <span className="req">*</span></legend>
          <div id="scReasons" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {reasons.map((x) => (
              <label key={x.code} className="check" style={x.code === reason ? { border: '2px solid var(--cocoa)', background: '#FBF5EE' } : undefined}>
                <input type="radio" name="scWhy" className="cb" value={x.code} checked={x.code === reason} onChange={() => { setReason(x.code); changed(); }} />{reasonLabel(x)}</label>
            ))}
          </div>
          {tried && !reason && <p className="err" style={{ marginTop: 6 }}><Icon name="warn" size={14} />{t('reasonRequired')}</p>}</fieldset>
        <div className="field"><label htmlFor="sNote">{t('noteFor')} {noteNeeded ? <span className="req">*</span> : <span className="opt">{t('optional')}</span>}</label>
          <textarea className="input" id="sNote" rows={2} maxLength={1000} value={note} aria-invalid={tried && noteNeeded && !note.trim()} onChange={(e) => { setNote(e.target.value); changed(); }} />
          {tried && noteNeeded && !note.trim() && <p className="err"><Icon name="warn" size={14} />{t('noteRequiredOther')}</p>}</div>
      </form>
      <section className="card stack" aria-labelledby="sr-h"><h2 id="sr-h">{t('result')}</h2>
        <div className="moves"><div className="mv"><span>{p ? pname(p) : '—'}</span><b className="neg">{ok ? fx(-qty, p.unit) : '—'}</b></div></div>
        {p && <div className="row mono" title={fx(p.qty, p.unit) + (ok ? ' → ' + fx(p.qty - qty, p.unit) : '')}>
          <span className="muted small" style={{ fontFamily: 'var(--f-body)' }}>{t('stockNow')}</span><span>{fq(p.qty, p.unit)}</span><span aria-hidden="true">→</span><strong>{ok ? fq(p.qty - qty, p.unit) : '…'}</strong></div>}
        <div className="small">{t('reason')}: <strong>{r ? reasonLabel(r) : '—'}</strong></div>
        {sending ? <button className="btn big danger" disabled aria-busy="true"><Spinner />{t('saving')}</button>
          : <button className="btn big danger" id="scSave" disabled={!!blocked} onClick={() => submit(false)}>{blocked || t('scSave')}</button>}
      </section>
    </div>
  </>);
}

/* ---------- Ledger (journal of documents and movement lines) ---------- */
const DOC_TYPES = ['receipt', 'production', 'adjustment', 'scrap', 'reversal'];

function LedgerPage({ params }) {
  const { me, toast } = useApp();
  const isOp = me.role === 'operator';
  const [f, setF] = useState({
    view: !isOp && params.view === 'lines' ? 'lines' : 'docs', q: params.q || '', doc_type: params.doc_type || '', product_id: params.product_id || '',
    created_by_id: params.created_by_id || '', date_from: params.date_from || '', date_to: params.date_to || '', page: Number(params.page) || 1,
  });
  const [qText, setQText] = useState(f.q);
  const [expanded, setExpanded] = useState({});
  const [openId, setOpenId] = useState(params.open ? Number(params.open) : null);
  const [csvBusy, setCsvBusy] = useState(false);

  const opts = useLoad(async () => {
    const [prods, users] = await Promise.all([
      isOp ? api('GET', '/stock') : api('GET', '/products', { query: { state: 'all', size: 100 } }).then((r) => r.items),
      me.role === 'admin' ? api('GET', '/users', { query: { size: 100 } }).then((r) => r.items) : Promise.resolve([]),
      loadMeta(),
    ]);
    return { prods: prods.map((p) => ({ id: p.id || p.product_id, name_uz: p.name_uz, name_ru: p.name_ru })), users };
  });

  const queryFor = (page) => {
    const q = { doc_type: f.doc_type, product_id: f.product_id, date_from: f.date_from, date_to: f.date_to, page, size: 20 };
    if (f.view === 'docs') { q.q = f.q.trim(); q.created_by_id = f.created_by_id; }
    return q;
  };
  // the result remembers which view it belongs to (documents and lines have different shapes)
  const data = useLoad(async () => ({ ...(await api('GET', f.view === 'docs' ? '/documents' : '/ledger', { query: queryFor(f.page) })), view: f.view }), [JSON.stringify(f)]);

  // keep filters (and the open document) in the address
  useEffect(() => {
    setHashQuery({
      view: f.view === 'lines' ? 'lines' : '', q: f.q, doc_type: f.doc_type, product_id: f.product_id, created_by_id: f.created_by_id,
      date_from: f.date_from, date_to: f.date_to, page: f.page > 1 ? f.page : '', open: openId || ''
    });
  }, [f, openId]);

  // search box: wait a little before asking the server
  useEffect(() => { if (qText === f.q) return undefined; const h = setTimeout(() => setF((x) => ({ ...x, q: qText, page: 1 })), 350); return () => clearTimeout(h); }, [qText]); // eslint-disable-line react-hooks/exhaustive-deps

  const upd = (patch) => setF((x) => ({ ...x, ...patch, page: patch.page || 1 }));
  const anyFilter = f.q || f.doc_type || f.product_id || f.created_by_id || f.date_from || f.date_to;

  async function exportCsv() {
    setCsvBusy(true);
    try {
      const q = queryFor(1); delete q.page; delete q.size;
      const rows = [];
      if (f.view === 'docs') {
        rows.push(['number', 'type', 'created_at', 'user', 'product_code', 'product', 'qty_delta', 'unit', 'qty_after', 'reason', 'note', 'reversed_by', 'reverses']);
        (await apiAll('/documents', q)).forEach((d) => d.entries.forEach((e) => rows.push([d.number, d.doc_type, fdts(d.created_at), d.created_by.full_name, e.product.code, pname(e.product),
        e.qty_delta, e.product.unit, e.qty_after, d.reason || '', d.note || '', d.reversed_by ? d.reversed_by.number : '', d.reverses ? d.reverses.number : ''])));
      } else {
        rows.push(['created_at', 'number', 'type', 'product_code', 'product', 'qty_delta', 'unit', 'qty_after', 'user', 'reversed_by']);
        (await apiAll('/ledger', q)).forEach((r) => rows.push([fdts(r.created_at), r.document.number, r.document.doc_type, r.product.code, pname(r.product), r.qty_delta,
        r.product.unit, r.qty_after, r.document.created_by.full_name, r.document.reversed_by ? r.document.reversed_by.number : '']));
      }
      const csv = '﻿' + rows.map((r) => r.map((c) => { const s = String(c == null ? '' : c); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `chocolate-${f.view === 'docs' ? 'documents' : 'ledger'}-${todayYmd()}.csv`;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    } catch (e) { toast(e.message, 'err'); }
    setCsvBusy(false);
  }

  const docCols = { gridTemplateColumns: '44px 100px 130px minmax(220px,1fr) 110px 140px' };
  const lineCols = { gridTemplateColumns: '140px 100px 130px minmax(140px,1fr) 110px 110px 110px' };
  const strikeNum = (struck) => (struck ? { textDecoration: 'line-through', color: 'var(--muted)' } : undefined);

  const body = (d) => {
    if (d.view !== f.view) return <Loading />;
    if (!d.items.length) {
      return anyFilter
        ? <Empty title={t('nothingFound')} text={t('nothingFoundT')}><button className="btn" onClick={() => { setQText(''); setF({ ...f, q: '', doc_type: '', product_id: '', created_by_id: '', date_from: '', date_to: '', page: 1 }); }}>{t('clearFilters')}</button></Empty>
        : <Empty title={t('emptyLedger')} text={t('emptyLedgerT')}>{!isOp && <a className="btn primary" href="#/receipt">{t('btnReceipt')}</a>}</Empty>;
    }
    if (f.view === 'docs') {
      return (
        <div className="scroll-x"><div className="tbl" style={{ minWidth: 820 }}>
          <div className="th" style={docCols}><span /><span>{t('colDoc')}</span><span>{t('colType')}</span><span>{t('colMoves')}</span><span>{t('colWho')}</span><span>{t('colDate')}</span></div>
          {d.items.map((doc) => {
            const struck = !!doc.reversed_by; const exp = !!expanded[doc.id];
            return (
              <Fragment key={doc.id}>
                <div className="tr" style={docCols}>
                  <button className="icon-btn ghost m-hide" aria-expanded={exp} aria-label={t(exp ? 'collapse' : 'expand', { num: doc.number })} onClick={() => setExpanded((x) => ({ ...x, [doc.id]: !exp }))}><Icon name={exp ? 'chevU' : 'chevD'} size={18} /></button>
                  <button className="link-btn mono" style={{ ...strikeNum(struck), justifySelf: 'start' }} data-open={doc.id} onClick={() => setOpenId(doc.id)}>{doc.number}</button>
                  <span className="m-right"><DocBadge type={doc.doc_type} /></span>
                  <span className="m-full" style={{ minWidth: 0 }}><span className={'small' + (struck ? ' strike' : '')} style={{ display: 'block' }}>{docSummary(doc)}</span>
                    {doc.reversed_by && <button className="link-btn xs" onClick={() => setOpenId(doc.reversed_by.id)}>{t('reversedBy', { num: doc.reversed_by.number })}</button>}
                    {doc.reverses && <button className="link-btn xs" onClick={() => setOpenId(doc.reverses.id)}>{t('reverses', { num: doc.reverses.number })}</button>}</span>
                  <span className="small m-sub">{shortName(doc.created_by.full_name)}</span><span className="small mono m-sub m-right">{fdt(doc.created_at)}</span>
                </div>
                {exp && <div style={{ margin: '0 0 10px 60px' }} className="moves exp-moves">{doc.entries.map((e) => (
                  <div className="mv" key={e.product.id}><span>{pname(e.product)}</span>
                    <span><b className={struck ? 'strike' : e.qty_delta < 0 ? 'neg' : 'pos'} title={fx(e.qty_delta, e.product.unit, true)}>{fq(e.qty_delta, e.product.unit, true)}</b> <span className="after">{t('after', { q: fq(e.qty_after, e.product.unit) })}</span></span></div>
                ))}</div>}
              </Fragment>
            );
          })}
        </div></div>
      );
    }
    return (
      <div className="scroll-x"><div className="tbl" style={{ minWidth: 860 }}>
        <div className="th" style={lineCols}><span>{t('colDate')}</span><span>{t('colDoc')}</span><span>{t('colType')}</span><span>{t('product')}</span><span className="right">{t('qty')}</span><span className="right">{t('colAfter')}</span><span>{t('colWho')}</span></div>
        {d.items.map((r) => {
          const struck = !!r.document.reversed_by;
          return (
            <div className="tr" style={lineCols} key={r.id}>
              <span className="small mono m-o5 m-sub">{fdt(r.created_at)}</span>
              <button className="link-btn mono m-o3" style={{ ...strikeNum(struck), justifySelf: 'start' }} data-open={r.document.id} onClick={() => setOpenId(r.document.id)}>{r.document.number}</button>
              <span className="m-hide"><DocBadge type={r.document.doc_type} /></span><span className="small m-o1" style={{ fontWeight: 600 }}>{pname(r.product)}</span>
              <span className={'right mono small m-o2 ' + (struck ? 'strike' : r.qty_delta < 0 ? 'neg' : 'pos')} style={{ fontWeight: 600 }} title={fx(r.qty_delta, r.product.unit, true)}>{fq(r.qty_delta, r.product.unit, true)}</span>
              <span className="right mono small m-o4 m-lbl" data-label={t('afterK')} title={fx(r.qty_after, r.product.unit)}>{fq(r.qty_after, r.product.unit)}</span>
              <span className="small m-o6 m-sub m-right">{shortName(r.document.created_by.full_name)}</span>
            </div>
          );
        })}
      </div></div>
    );
  };

  const o = opts.data || { prods: [], users: [] };
  return (<>
    <PageHead title={isOp ? t('myDocs') : t('lgTitle')}>
      {!isOp && <div className="seg" role="group" aria-label="View" id="vSw">
        <button type="button" data-v="docs" aria-pressed={f.view === 'docs'} onClick={() => upd({ view: 'docs' })}>{t('vDocs')}</button>
        <button type="button" data-v="lines" aria-pressed={f.view === 'lines'} onClick={() => upd({ view: 'lines' })}>{t('vLines')}</button></div>}
      <button className="btn" id="csv" disabled={csvBusy} onClick={exportCsv}>{csvBusy ? <><Spinner dark />{t('csvBusy')}</> : <><Icon name="download" size={18} />{t('exportCsv')}</>}</button>
    </PageHead>
    <section className="card" aria-label={t('filters')} style={{ padding: '16px 20px' }}>
      <div className="filters-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(150px,100%),1fr))', gap: '12px 14px', alignItems: 'end' }}>
        {f.view === 'docs' && <div className="field f-wide"><label htmlFor="fq">{t('search')}</label><input className="input mono" id="fq" type="search" placeholder={t('fNumber')} value={qText} onChange={(e) => setQText(e.target.value)} /></div>}
        <div className="field"><label htmlFor="ft">{t('fType')}</label><select className="input" id="ft" value={f.doc_type} onChange={(e) => upd({ doc_type: e.target.value })}>
          <option value="">{t('all')}</option>{DOC_TYPES.map((x) => <option key={x} value={x}>{t('t_' + x)}</option>)}</select></div>
        <div className="field"><label htmlFor="fp">{t('product')}</label><select className="input" id="fp" value={f.product_id} onChange={(e) => upd({ product_id: e.target.value })}>
          <option value="">{t('all')}</option>{o.prods.map((p) => <option key={p.id} value={p.id}>{pname(p)}</option>)}</select></div>
        {me.role === 'admin' && f.view === 'docs' && <div className="field"><label htmlFor="fu">{t('fUser')}</label><select className="input" id="fu" value={f.created_by_id} onChange={(e) => upd({ created_by_id: e.target.value })}>
          <option value="">{t('all')}</option>{o.users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}</select></div>}
        <div className="field"><label htmlFor="fd1">{t('fFrom')}</label><input className="input" id="fd1" type="date" value={f.date_from} onChange={(e) => upd({ date_from: e.target.value })} /></div>
        <div className="field"><label htmlFor="fd2">{t('fTo')}</label><input className="input" id="fd2" type="date" value={f.date_to} onChange={(e) => upd({ date_to: e.target.value })} /></div>
      </div>
    </section>
    <section className="card" style={{ padding: '8px 20px 16px' }} aria-label={t('lgTitle')}>
      {data.loading && !data.data ? <Loading /> : <Async state={data}>{(d) => <>{body(d)}<Pager data={d} onPage={(pg) => { setF((x) => ({ ...x, page: pg })); window.scrollTo(0, 0); }} /></>}</Async>}
    </section>
    {openId && <DocDrawer id={openId} onOpen={setOpenId} onClose={() => setOpenId(null)} onChanged={() => data.reload(true)} />}
  </>);
}

function DocDrawer({ id, onOpen, onClose, onChanged }) {
  const { me } = useApp();
  const st = useLoad(() => api('GET', '/documents/' + id), [id]);
  const [askRev, setAskRev] = useState(false);
  const d = st.data;
  let content;
  if (!d) content = st.error ? <><DrawerHead title="" onClose={onClose} /><ErrBox error={st.error} /></> : <Loading />;
  else {
    const struck = !!d.reversed_by;
    const canReverse = me.role === 'admin' && d.doc_type !== 'reversal' && !d.reversed_by;
    const printable = d.doc_type === 'receipt' || d.doc_type === 'production';
    const extra = [];
    if (d.doc_type === 'production' && d.product) extra.push([t('recipeK'), `${pname(d.product)} · v${d.recipe_version ? d.recipe_version.version : '?'}`]);
    if (d.doc_type === 'receipt') {
      const s = [d.supplier_doc_no, d.supplier_name].filter(Boolean).join(' · ');
      if (s) extra.push([t('supplierK'), s + (d.supplier_doc_date ? ` (${fday(d.supplier_doc_date)})` : '')]);
    }
    if (d.doc_type === 'adjustment' || d.doc_type === 'scrap') extra.push([t('reasonK'), findReason(d.reason, d.doc_type)]);
    if (d.doc_type === 'reversal') extra.push([t('reasonK'), d.note || '—']);
    else if (d.note) extra.push([t('noteK'), d.note]);
    content = (<>
      <div className="drawer-head">
        <div><DocBadge type={d.doc_type} /><h2 style={{ marginTop: 8, textDecoration: struck ? 'line-through' : undefined }}>{d.number}</h2></div>
        <button className="icon-btn ghost" aria-label={t('close')} onClick={onClose}><Icon name="x" /></button>
      </div>
      <span className={'badge ' + (struck ? 'b-reversal' : 'b-ok')} style={{ alignSelf: 'flex-start', gap: 6 }}><Icon name={struck ? 'undo' : 'check'} size={14} />{struck ? t('stReversed') : t('stDone')}</span>
      <dl><dt>{t('colDate')}</dt><dd className="mono">{fdts(d.created_at)}</dd><dt>{t('colWho')}</dt><dd>{d.created_by.full_name}</dd>
        {extra.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>
      <div className="moves">{d.entries.map((e) => (
        <div className="mv" key={e.product.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2px 12px' }}>
          <span style={{ fontWeight: 600 }}>{pname(e.product)}</span><b className={struck ? 'strike' : e.qty_delta < 0 ? 'neg' : 'pos'}>{fx(e.qty_delta, e.product.unit, true)}</b>
          <span className="after">{t('afterK')}</span><span className="after">{fx(e.qty_after, e.product.unit)}</span>
        </div>
      ))}</div>
      {d.doc_type === 'production' && d.snapshot && d.snapshot.length > 0 && <div className="small muted">
        {t('compTitle', { v: d.recipe_version ? d.recipe_version.version : '?' })}: {d.snapshot.map((s) => `${pname(s.raw_product)} ${fx(s.qty_per_unit, s.raw_product.unit)}`).join(' · ')}</div>}
      {d.reversed_by && <button className="btn" onClick={() => onOpen(d.reversed_by.id)}><Icon name="undo" size={18} />{t('reversedBy', { num: d.reversed_by.number })}</button>}
      {d.reverses && <button className="btn" onClick={() => onOpen(d.reverses.id)}><Icon name="undo" size={18} />{t('reverses', { num: d.reverses.number })}</button>}
      <div className="actions" style={{ marginTop: 'auto' }}>
        {canReverse && <><button className="btn danger" id="revBtn" onClick={() => setAskRev(true)}><Icon name="undo" size={18} />{t('reverseBtn')}</button>
          <span className="icon-btn ghost" title={t('reverseInfo')} aria-label={t('reverseInfo')} role="img"><Icon name="info" size={18} /></span></>}
        {printable && <a className="btn" href={`#/print/${d.id}`}><Icon name="print" size={18} />{t('print')}</a>}
      </div>
      <div className="xs muted mono">{t('requestId', { id: d.request_id })}</div>
    </>);
  }
  return (<>
    <Layer drawer onClose={onClose} dismissable={!askRev}>{content}</Layer>
    {askRev && d && <ReverseModal doc={d} onClose={() => setAskRev(false)} onDone={() => { setAskRev(false); st.reload(true); onChanged(); }} />}
  </>);
}

function ReverseModal({ doc, onClose, onDone }) {
  const { toast, refreshLow } = useApp();
  const [why, setWhy] = useState('');
  const [short, setShort] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const reqId = useRef(null);
  async function go() {
    const text = why.trim();
    if (text.length < 3) { setShort(true); return; }
    if (!reqId.current) reqId.current = uuid();
    setBusy(true); setErr(null);
    try {
      const rev = await api('POST', `/documents/${doc.id}/reverse`, { body: { request_id: reqId.current, reason: text } });
      toast(t('revDone', { num: rev.number })); refreshLow(); onDone();
    } catch (e) {
      setBusy(false);
      if (!(e.network || e.retryable)) reqId.current = null; // keep the id only for a safe retry
      setErr(e);
    }
  }
  return (
    <Layer onClose={onClose}>
      <h2>{t('revTitle', { num: doc.number })}</h2><p>{t('revText')}</p>
      <div className="moves">{doc.entries.map((e) => <div className="mv" key={e.product.id}><span>{pname(e.product)}</span><b className={-e.qty_delta < 0 ? 'neg' : 'pos'}>{fx(-e.qty_delta, e.product.unit, true)}</b></div>)}</div>
      <div className="field"><label htmlFor="revWhy">{t('reason')} <span className="req">*</span></label>
        <textarea className="input" id="revWhy" rows={2} maxLength={1000} placeholder={t('revWhyPh')} value={why} aria-invalid={short} data-autofocus
          onChange={(e) => { setWhy(e.target.value); setShort(false); reqId.current = null; }} />
        {short && <p className="err" id="revE"><Icon name="warn" size={14} />{t('revWhyShort')}</p>}</div>
      {err && err.code === 'NEGATIVE_BALANCE' && err.data ? (
        <Alert kind="err" title={t('revNeg')}>{err.data.lines.map((l) => <div key={l.product.id} className="small mono">{t('revNegLine', { name: pname(l.product), cur: fx(l.current, l.product.unit), d: fx(l.delta, l.product.unit, true), w: fx(l.would_be, l.product.unit) })}</div>)}</Alert>
      ) : <ErrBox error={err} />}
      <div className="foot"><button className="btn" onClick={onClose}>{t('cancel')}</button>
        <button className="btn danger" id="revOk" disabled={busy} onClick={go}>{busy ? <><Spinner />{t('sending')}</> : t('reverseBtn')}</button></div>
    </Layer>
  );
}

/* ================================================================
   12. Screens: products, recipes, users, print
   ================================================================ */

/* ---------- Products ---------- */
function ProductsPage({ params }) {
  const { me, toast, refreshLow } = useApp();
  const canEdit = me.role === 'admin';
  const [state, setState] = useState(params.state === 'archived' ? 'archived' : 'active');
  const [qText, setQText] = useState(''); const [q, setQ] = useState('');
  const [editor, setEditor] = useState(canEdit && params.new === '1' ? { product: null } : null);
  useEffect(() => { const h = setTimeout(() => setQ(qText), 300); return () => clearTimeout(h); }, [qText]);
  const st = useLoad(async () => {
    const [list, a, b] = await Promise.all([
      api('GET', '/products', { query: { state, size: 100, q: q.trim() } }),
      api('GET', '/products', { query: { state: 'active', size: 100 } }),
      api('GET', '/products', { query: { state: 'archived', size: 1 } }),
    ]);
    return { rows: list.items, active: a.items, counts: { active: a.total, archived: b.total } };
  }, [state, q]);
  useEffect(() => { setHashQuery({ state: state === 'archived' ? 'archived' : '' }); }, [state]);

  const cols = { gridTemplateColumns: `90px minmax(140px,1.3fr) minmax(140px,1.3fr) 130px 70px 100px 120px${canEdit ? ' 44px' : ''}` };
  const d = st.data;
  const rawN = d ? d.active.filter((x) => x.kind === 'raw').length : 0;
  const rowEl = (p) => (
    <div className="tr" style={cols} key={p.id}>
      <span className="mono small m-o3" style={{ fontWeight: 600 }}>{p.code}</span><span className="m-o1" style={{ fontWeight: 600 }}>{p.name_uz}</span><span lang="ru" className="m-o5 m-full m-sub">{p.name_ru}</span>
      <span className="m-o4 m-right"><span className={`badge b-${p.kind}`}>{t(p.kind)}</span></span><span className="small m-hide">{p.unit === 'pcs' ? t('pcs') : t('g')}</span>
      <span className="mono small m-o6 m-lbl" data-label={t('colMin')} title={fx(p.min_qty, p.unit)}>{fq(p.min_qty, p.unit)}</span><span className="mono small m-o7 m-lbl" data-label={t('colTarget')} title={fx(p.target_qty, p.unit)}>{fq(p.target_qty, p.unit)}</span>
      {canEdit && <button className="icon-btn ghost m-o2 m-right" data-edit={p.id} aria-label={`${t('edit')}: ${p.code}`} onClick={() => setEditor({ product: p })}><Icon name="edit" size={18} /></button>}
    </div>
  );
  return (<>
    <PageHead title={t('pdTitle')} sub={d ? t('pdSub', { r: rawN, f: d.active.length - rawN }) : ''}>
      {canEdit ? <button className="btn primary" id="pdNew" onClick={() => setEditor({ product: null })}>{t('newProduct')}</button> : <span className="badge b-off">{t('readOnly')}</span>}
    </PageHead>
    <div className="row" style={{ gap: 12 }}>
      <div className="seg" role="group">
        <button type="button" aria-pressed={state === 'active'} onClick={() => setState('active')}>{t('active')} · {d ? d.counts.active : '…'}</button>
        <button type="button" aria-pressed={state === 'archived'} onClick={() => setState('archived')}>{t('archive')} · {d ? d.counts.archived : '…'}</button>
      </div>
      <div className="search"><Icon name="search" size={18} /><input type="search" aria-label={t('search')} placeholder={t('searchPh')} value={qText} onChange={(e) => setQText(e.target.value)} /></div>
    </div>
    <section className="card" style={{ padding: '8px 20px 12px' }}>
      <Async state={st}>{({ rows }) => (!rows.length ? <Empty title={t('nothingFound')} text={q ? t('nothingFoundT') : ''} /> : (
        <div className="scroll-x"><div className="tbl" style={{ minWidth: 860 }}>
          <div className="th" style={cols}><span>{t('colCode')}</span><span>{t('colNameUz')}</span><span>{t('colNameRu')}</span><span>{t('colKind')}</span><span>{t('colUnit')}</span><span>{t('colMin')}</span><span>{t('colTarget')}</span>{canEdit && <span />}</div>
          {['raw', 'finished'].map((k) => { const part = rows.filter((x) => x.kind === k); return part.length ? <Fragment key={k}><div className="sec">{t(k)}</div>{part.map(rowEl)}</Fragment> : null; })}
        </div></div>
      ))}</Async>
    </section>
    {editor && <ProductEditor product={editor.product} onClose={() => setEditor(null)}
      onSaved={(msg) => { toast(msg); setEditor(null); st.reload(true); refreshLow(); }} />}
  </>);
}

const amountState = (qty, unit) => {
  if (unit === 'pcs') return { text: String(qty || 0), mode: 'pcs' };
  const mode = qty && qty < 1000 ? 'g' : 'kg';
  return { text: qtyToInput(qty || 0, mode), mode };
};

function ProductEditor({ product: p, onClose, onSaved }) {
  const isNew = !p;
  const [kind, setKind] = useState(p ? p.kind : 'raw');
  const [unit, setUnit] = useState(p ? p.unit : 'g');
  const [uz, setUz] = useState(p ? p.name_uz : ''); const [ru, setRu] = useState(p ? p.name_ru : '');
  const [code, setCode] = useState(p ? p.code : '');
  const [min, setMin] = useState(amountState(p ? p.min_qty : 0, unit));
  const [tgt, setTgt] = useState(amountState(p ? p.target_qty : 0, unit));
  const [bad, setBad] = useState({});
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState('');

  const changeUnit = (u) => { setUnit(u); setMin(amountState(readQty(min, unit) || 0, u)); setTgt(amountState(readQty(tgt, unit) || 0, u)); };

  async function save() {
    const minV = readQty(min, unit); const tgtV = readQty(tgt, unit);
    const b = { uz: !uz.trim(), ru: !ru.trim(), min: minV == null, tgt: tgtV == null };
    setBad(b); if (Object.values(b).some(Boolean)) return;
    if (tgtV < minV) { setErr({ message: t('targetBelowMin') }); return; }
    setBusy('save'); setErr(null);
    try {
      if (isNew) {
        const res = await api('POST', '/products', { body: { code: code.trim() || null, name_uz: uz.trim(), name_ru: ru.trim(), kind, unit, min_qty: minV, target_qty: tgtV } });
        onSaved(t('pdCreated', { code: res.code }));
      } else {
        await api('PATCH', '/products/' + p.id, { body: { name_uz: uz.trim(), name_ru: ru.trim(), min_qty: minV, target_qty: tgtV } });
        onSaved(t('pdSaved'));
      }
    } catch (e) { setBusy(''); setErr(e); }
  }
  async function archive() {
    setBusy('arch'); setErr(null);
    try {
      const res = await api('POST', `/products/${p.id}/${p.is_archived ? 'unarchive' : 'archive'}`);
      onSaved(t(p.is_archived ? 'pdUnarchived' : 'pdArchived', { code: res.code }));
    } catch (e) { setBusy(''); setErr(e); }
  }

  return (
    <Layer drawer onClose={onClose}>
      <DrawerHead pre={p && <div className="mono small muted">{p.code}</div>} title={isNew ? t('pdNew') : t('edit')} onClose={onClose} />
      <ErrBox error={err} />
      <fieldset className="stack" style={{ gap: 12 }}><legend>{t('pdName')}</legend>
        <div className="field"><label htmlFor="nUz"><span className="badge b-off">UZ</span> {t('uzName')} <span className="req">*</span></label>
          <input className="input" id="nUz" maxLength={150} value={uz} aria-invalid={!!bad.uz} data-autofocus onChange={(e) => setUz(e.target.value)} /></div>
        <div className="field"><label htmlFor="nRu"><span className="badge b-off">RU</span> {t('ruName')} <span className="req">*</span></label>
          <input className="input" id="nRu" lang="ru" maxLength={150} value={ru} aria-invalid={!!bad.ru} onChange={(e) => setRu(e.target.value)} /></div>
      </fieldset>
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="field"><label htmlFor="pCode">{t('code')}</label>
          <input className="input mono" id="pCode" maxLength={20} value={code} disabled={!isNew} placeholder={kind === 'raw' ? 'XA-…' : 'TM-…'} onChange={(e) => setCode(e.target.value)} /></div>
        <div className="field"><label htmlFor="pKind">{t('kind')}</label>
          <select className="input" id="pKind" value={kind} disabled={!isNew} onChange={(e) => { setKind(e.target.value); if (e.target.value === 'finished') changeUnit('pcs'); }}>
            <option value="raw">{t('raw')}</option><option value="finished">{t('finished')}</option></select></div>
      </div>
      <span className="help" style={{ marginTop: -8 }}>{isNew ? t('codeHelp') : <><Icon name="lock" size={14} /> {t('lockedHelp')}</>}</span>
      <fieldset><legend>{t('unit')}</legend>
        <div className="seg" style={{ marginTop: 8 }}>
          <button type="button" aria-pressed={unit === 'g'} disabled={!isNew || kind === 'finished'} onClick={() => changeUnit('g')}>{t('g')}</button>
          <button type="button" aria-pressed={unit === 'pcs'} disabled={!isNew} onClick={() => changeUnit('pcs')}>{t('pcs')}</button>
        </div></fieldset>
      <div className="field"><label htmlFor="pMin">{t('minQty')}</label><QtyInput id="pMin" value={min} unit={unit} invalid={bad.min} onChange={setMin} /></div>
      <div className="field"><label htmlFor="pTgt">{t('targetQty')}</label><QtyInput id="pTgt" value={tgt} unit={unit} invalid={bad.tgt} onChange={setTgt} /><span className="help">{t('targetHelp')}</span></div>
      <div className="actions">
        <button className="btn primary" id="peSave" disabled={!!busy} onClick={save}>{busy === 'save' ? <><Spinner />{t('saving')}</> : t('save')}</button>
        <button className="btn" onClick={onClose}>{t('cancel')}</button>
      </div>
      {p && <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="btn" style={{ alignSelf: 'flex-start' }} disabled={!!busy} onClick={archive}><Icon name={p.is_archived ? 'undo' : 'box'} size={18} />{p.is_archived ? t('unarchiveBtn') : t('archiveBtn')}</button>
        <span className="help">{t('archiveHelp')}</span></div>}
    </Layer>
  );
}

/* ---------- Recipes (versions: draft -> active -> archived) ---------- */
function RecipesPage({ params }) {
  const st = useLoad(async () => { const [sums, raws] = await Promise.all([api('GET', '/recipes'), api('GET', '/stock', { query: { kind: 'raw' } })]); return { sums, raws }; });
  return <Async state={st}>{({ sums, raws }) => (!sums.length ? (<>
    <PageHead title={t('rcpTitle')} />
    <div className="card"><Empty title={t('noFinished')}><a className="btn primary" href="#/products?new=1">{t('ob1b')}</a></Empty></div>
  </>) : <RecipesView initialSums={sums} raws={raws} params={params} />)}</Async>;
}

function RecipesView({ initialSums, raws, params }) {
  const { confirm } = useApp();
  const [sums, setSums] = useState(initialSums);
  const [pid, setPid] = useState(() => (initialSums.find((s) => s.product.id === Number(params.product)) ? Number(params.product) : initialSums[0].product.id));
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [draft, setDraft] = useState(null); // {id, version, note, lines:[{raw, qty}]}
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const rawById = useMemo(() => Object.fromEntries(raws.map((r) => [r.product_id, r])), [raws]);

  const prod = useLoad(async () => {
    const [versions, cap] = await Promise.all([
      api('GET', `/recipes/products/${pid}/versions`),
      api('GET', '/stock/capacity', { query: { product_id: pid } }).catch(() => []),
    ]);
    const vs = versions.sort((a, b) => a.version - b.version);
    const dr = vs.find((v) => v.status === 'draft');
    const ac = vs.find((v) => v.status === 'active');
    setDraft(dr ? { id: dr.id, version: dr.version, note: dr.note || '', lines: dr.lines.map((l) => ({ raw: l.raw_product.id, qty: String(l.qty_per_unit) })) } : null);
    setDirty(false);
    setViewId((ac || dr || vs[vs.length - 1] || {}).id || null);
    return { versions: vs, cap: cap[0] || null };
  }, [pid]);

  useEffect(() => { setHashQuery({ product: pid }); }, [pid]);

  async function reloadAll() { setSums(await api('GET', '/recipes')); await prod.reload(true); }

  const navLabel = (s) => (s.active ? t('rcpActive', { v: s.active.version }) + (s.draft_version ? t('rcpDraftToo', { v: s.draft_version }) : '') : s.draft_version ? t('rcpDraftOnly') : t('rcpNone'));
  const s = sums.find((x) => x.product.id === pid);
  const data = prod.data;
  const versions = data ? data.versions : [];
  const active = versions.find((v) => v.status === 'active');
  const view = versions.find((v) => v.id === viewId);
  const prevOf = (v) => versions.filter((x) => x.version < v.version && x.status !== 'draft').pop();
  const statusTxt = (v) => (v.status === 'active' ? t('vActive') : v.status === 'draft' ? t('vDraft') : t('vArchived'));
  const unitOf = (rawId) => (rawById[rawId] ? rawById[rawId].unit : 'g');
  const uLabel = (u) => (u === 'pcs' ? t('pcs') : t('g'));

  const draftDiff = (l) => {
    if (!active) return null;
    const al = active.lines.find((x) => x.raw_product.id === l.raw); const q = parseQty(l.qty, 'g');
    if (!al) return l.raw ? <span className="badge b-ok">{t('newLine')}</span> : null;
    if (al.qty_per_unit === q) return <span className="muted xs">—</span>;
    return <span className="badge b-warn">{al.qty_per_unit} → {q == null ? '?' : q} {uLabel(unitOf(l.raw))}</span>;
  };
  const setLine = (i, patch) => { setDraft((d) => ({ ...d, lines: d.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) })); setDirty(true); };

  function payload() {
    const lines = draft.lines.filter((l) => l.raw || l.qty).map((l) => ({ raw_product_id: l.raw, qty_per_unit: parseQty(l.qty, 'g') }));
    const bad = lines.some((l) => !l.raw_product_id || !l.qty_per_unit || l.qty_per_unit <= 0);
    return { lines, bad, note: draft.note.trim() || null };
  }
  async function saveDraft() {
    const pl = payload(); if (pl.bad) throw new ApiError({ code: 'BAD', message: t('badQty') });
    await api('PATCH', `/recipes/versions/${draft.id}`, { body: { lines: pl.lines, note: pl.note } });
    setDirty(false);
  }
  const run = async (name, fn) => { setBusy(name); setErr(null); try { await fn(); } catch (e) { setErr(e); } setBusy(''); };

  function compTable(v, base) {
    const baseMap = base ? Object.fromEntries(base.lines.map((l) => [l.raw_product.id, l.qty_per_unit])) : null;
    const cap = data && data.cap;
    const capMap = cap && v.status === 'active' ? Object.fromEntries(cap.lines.map((l) => [l.raw_product.id, l])) : {};
    const cols = { gridTemplateColumns: 'minmax(140px,1.4fr) 100px minmax(110px,1fr) minmax(120px,1fr)' };
    return (
      <div className="tbl">
        <div className="th" style={cols}><span>{t('raw')}</span><span>{t('norm')}</span><span>{base ? t('diffWith', { v: base.version }) : ''}</span><span>{v.status === 'active' ? t('enoughFor') : ''}</span></div>
        {v.lines.map((l) => {
          const b = baseMap ? baseMap[l.raw_product.id] : undefined; const c = capMap[l.raw_product.id];
          const isLim = cap && cap.limiting && cap.limiting.id === l.raw_product.id;
          return (
            <div className="tr" style={cols} key={l.raw_product.id}>
              <span>{pname(l.raw_product)}</span><span className="mono">{fx(l.qty_per_unit, l.raw_product.unit)}</span>
              <span>{!baseMap ? null : b === undefined ? <span className="badge b-ok">{t('newLine')}</span> : b === l.qty_per_unit ? <span className="muted small">{t('unchanged')}</span>
                : <span className="badge b-warn">{b} → {l.qty_per_unit} {uLabel(l.raw_product.unit)}</span>}</span>
              <span className={'mono small' + (isLim ? ' lowc' : '')} style={{ fontWeight: 600 }}>{c ? `${grp(c.max_by_this)} ${t('pcs')}${isLim ? ' · ' + t('limitingW') : ''}` : ''}</span>
            </div>
          );
        })}
        {baseMap && base.lines.filter((bl) => !v.lines.find((l) => l.raw_product.id === bl.raw_product.id)).map((bl) => (
          <div className="tr" style={{ ...cols, color: 'var(--muted)' }} key={'x' + bl.raw_product.id}>
            <span className="strike">{pname(bl.raw_product)}</span><span className="mono strike">{fx(bl.qty_per_unit, bl.raw_product.unit)}</span><span><span className="badge b-err">{t('removed')}</span></span><span />
          </div>
        ))}
      </div>
    );
  }

  let editor = null;
  if (draft) {
    const used = new Set(draft.lines.map((l) => l.raw));
    editor = (
      <div id="drBox" style={{ border: '2px dashed var(--accent)', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}><h3>{t('draftTitle', { v: draft.version })}</h3><span className="xs muted">{t('draftHelp')}</span></div>
        <div className="rl th" style={{ borderTop: 0, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}><span>{t('raw')}</span><span>{t('norm')}</span><span>{active ? t('diffWith', { v: active.version }) : ''}</span><span /></div>
        {draft.lines.map((l, i) => {
          const q = parseQty(l.qty, 'g');
          return (
            <div className="rl" key={i}>
              <select className="input m-full m-o1" aria-label={`${t('raw')} ${i + 1}`} value={l.raw} onChange={(e) => setLine(i, { raw: e.target.value ? Number(e.target.value) : '' })}>
                <option value="">{t('choose')}</option>
                {raws.map((x) => <option key={x.product_id} value={x.product_id} disabled={used.has(x.product_id) && x.product_id !== l.raw}>{pname(x)}</option>)}
              </select>
              <div className="unit-wrap m-o2"><input className="input mono" inputMode="numeric" value={l.qty} aria-label={`${t('norm')} ${i + 1}`} data-f="qty"
                aria-invalid={l.qty !== '' && (q == null || q <= 0)} onChange={(e) => setLine(i, { qty: e.target.value })} /><span className="unit-tag">{uLabel(unitOf(l.raw))}</span></div>
              <span className="m-o4 m-full">{draftDiff(l)}</span>
              <button type="button" className="icon-btn ghost m-o3" aria-label={t('removeLine', { n: i + 1 })} onClick={() => { setDraft((d) => ({ ...d, lines: d.lines.filter((_, j) => j !== i) })); setDirty(true); }}><Icon name="x" size={18} /></button>
            </div>
          );
        })}
        {active && active.lines.filter((al) => !used.has(al.raw_product.id)).map((al) => (
          <div className="rl" style={{ color: 'var(--muted)' }} key={'x' + al.raw_product.id}><span className="strike">{pname(al.raw_product)}</span><span className="mono strike">{fx(al.qty_per_unit, al.raw_product.unit)}</span><span><span className="badge b-err">{t('removed')}</span></span><span /></div>
        ))}
        <button type="button" className="btn" id="drAdd" style={{ alignSelf: 'flex-start' }} disabled={draft.lines.length >= raws.length}
          onClick={() => { setDraft((d) => ({ ...d, lines: [...d.lines, { raw: '', qty: '' }] })); setDirty(true); }}>{t('addRaw')}</button>
        <div className="field"><label htmlFor="drNote">{t('rcpNote')} <span className="opt">{t('optional')}</span></label>
          <input className="input" id="drNote" maxLength={500} value={draft.note} onChange={(e) => { setDraft((d) => ({ ...d, note: e.target.value })); setDirty(true); }} /></div>
        <div className="actions">
          <button className="btn primary" id="drAct" disabled={!!busy} onClick={async () => {
            const v = draft.version;
            if (payload().bad) { setErr({ message: t('badQty') }); return; }
            const ok = await confirm({
              title: t('actTitle', { v }), text: t('actText', { v }), okText: t('activateV', { v }),
              extra: <div className="row small"><span className="badge b-ok">v{v}</span>{t('actNew', { v })}{active && <> · <span className="badge b-off">v{active.version}</span>{t('actOld', { v: active.version })}</>}</div>
            });
            if (!ok) return;
            run('act', async () => {
              if (dirty) await saveDraft();
              await api('POST', `/recipes/versions/${draft.id}/activate`);
              setMsg(t('actDone', { v }) + (active ? ' ' + t('actOld', { v: active.version }) + '.' : ''));
              await reloadAll();
            });
          }}><Icon name="check" size={18} />{t('activateV', { v: draft.version })}</button>
          <button className="btn" id="drSave" disabled={!!busy} onClick={() => run('save', async () => { await saveDraft(); setMsg(t('draftSaved')); await reloadAll(); })}>{busy === 'save' ? <><Spinner dark />{t('saving')}</> : t('saveDraft')}</button>
          <button className="btn ghost" disabled={!!busy} onClick={async () => {
            if (!(await confirm({ title: t('delDraftQ'), okText: t('deleteDraft'), danger: true }))) return;
            run('del', async () => { await api('DELETE', `/recipes/versions/${draft.id}`); setMsg(t('draftDeleted')); await reloadAll(); });
          }}><Icon name="trash" size={18} />{t('deleteDraft')}</button>
          {dirty && <span className="xs lowc">{t('unsaved')}</span>}
        </div>
      </div>
    );
  }

  return (<>
    <PageHead title={t('rcpTitle')} />
    <div className="rc-layout">
      <nav className="rc-nav" id="rcNav" aria-label={t('nav_products')}>
        {sums.map((x, i) => (
          <button type="button" key={x.product.id} aria-current={x.product.id === pid} onClick={() => { setPid(x.product.id); setMsg(''); setErr(null); }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, flex: 'none', background: SERIES_COLORS[i % SERIES_COLORS.length], boxShadow: 'inset 0 -4px 0 rgba(0,0,0,.25)' }} />
            <span><b>{pname(x.product)}</b><small>{navLabel(x)}</small></span>
          </button>
        ))}
      </nav>
      <section className="card stack" id="rcMain" style={{ gap: 20 }}>
        <Async state={prod}>{() => (<>
          <div className="row" style={{ justifyContent: 'space-between' }}><h2 style={{ fontSize: 24 }}>{pname(s.product)}</h2>
            {active ? <span className="badge b-ok" style={{ gap: 6 }}><Icon name="check" size={14} />{t('activeV', { v: active.version })}</span> : <span className="badge b-warn">{t('noActive')}</span>}</div>
          {msg && <Alert kind="ok">{msg}</Alert>}
          <ErrBox error={err} />
          {versions.length > 0 && <ol className="vers" aria-label="Versions">{versions.map((v) => (
            <li key={v.id}><button type="button" aria-current={v.id === viewId} onClick={() => { setViewId(v.id); setMsg(''); }}>
              <b>v{v.version}</b><small>{v.status === 'draft' ? t('vDraft') : `${fdate(v.activated_at || v.created_at)} · ${statusTxt(v)}`}</small></button></li>
          ))}</ol>}
          {view && view.status !== 'draft' && <div className="stack" style={{ gap: 8 }}>
            <h3>{t('compTitle', { v: view.version })}</h3>{view.note && <p className="small muted" style={{ margin: 0 }}>{view.note}</p>}
            {compTable(view, prevOf(view))}
            <p className="xs muted" style={{ margin: 0 }}>{view.created_by.full_name} · {fdt(view.created_at)}</p></div>}
          {draft ? editor : <button className="btn primary" id="newVer" style={{ alignSelf: 'flex-start' }} disabled={!!busy}
            onClick={() => run('new', async () => { await api('POST', `/recipes/products/${pid}/versions`, { body: {} }); setMsg(''); await reloadAll(); })}>{t('newVersion')}</button>}
        </>)}</Async>
      </section>
    </div>
  </>);
}

/* ---------- Users ---------- */
function UsersPage() {
  const { me, toast, confirm } = useApp();
  const st = useLoad(() => api('GET', '/users', { query: { size: 100 } }).then((r) => r.items));
  const [panel, setPanel] = useState(null); // {kind:'new'|'edit'|'reset', user}
  const [err, setErr] = useState(null);
  const cols = { gridTemplateColumns: 'minmax(160px,1.3fr) minmax(90px,.7fr) minmax(120px,1fr) minmax(110px,1fr) 130px max-content' };
  const isLocked = (u) => u.locked_until && new Date(u.locked_until) > new Date();
  const done = (text) => { toast(text); setPanel(null); st.reload(true); };
  async function toggleActive(u) {
    if (u.is_active && !(await confirm({ title: `${t('block')}: ${u.full_name}?`, okText: t('block'), danger: true }))) return;
    setErr(null);
    try { await api('PATCH', '/users/' + u.id, { body: { is_active: !u.is_active } }); toast(t('usSaved')); st.reload(true); } catch (e) { setErr(e); }
  }
  const users = st.data || [];
  const blocked = users.filter((u) => !u.is_active).length;
  return (<>
    <PageHead title={t('usTitle')} sub={st.data ? t('usSub', { n: users.length }) + (blocked ? t('usSubBlocked', { n: blocked }) : '') : ''}>
      <button className="btn primary" id="usNew" onClick={() => setPanel({ kind: 'new' })}>{t('newUser')}</button>
    </PageHead>
    <ErrBox error={err} />
    <section className="card" style={{ padding: '8px 20px 12px' }}>
      <Async state={st}>{() => (
        <div className="scroll-x"><div className="tbl" style={{ minWidth: 900 }}>
          <div className="th" style={cols}><span>{t('colUser')}</span><span>{t('colLogin')}</span><span>{t('colRole')}</span><span>{t('colStatus')}</span><span>{t('colLast')}</span><span /></div>
          {users.map((u) => {
            const self = u.id === me.id;
            const status = !u.is_active ? <span className="badge b-err">{t('usBlocked')}</span> : isLocked(u) ? <span className="badge b-warn">{t('usLocked')}</span>
              : u.must_change_password ? <span className="badge b-warn">{t('usMustChange')}</span> : <span className="badge b-ok">{t('usActive')}</span>;
            return (
              <div className="tr" style={{ ...cols, color: u.is_active ? undefined : 'var(--muted)' }} key={u.id}>
                <span className="row m-o1" style={{ flexWrap: 'nowrap' }}><span className="ava" aria-hidden="true" style={{ background: u.is_active ? '#6B4A3A' : '#CDBBAA' }}>{initials(u.full_name)}</span>
                  <strong>{u.full_name}{self && <span className="xs muted"> ({t('you')})</span>}</strong></span>
                <span className="mono small m-o3">{u.login}</span><span className="small m-o4 m-right">{t('role_' + u.role)}</span><span className="m-o2 m-right">{status}</span>
                <span className="small mono m-o5 m-full m-sub m-lbl" data-label={t('colLast')}>{u.last_login_at ? fdt(u.last_login_at) : <span className="muted" style={{ fontFamily: 'var(--f-body)' }}>{t('neverLogged')}</span>}</span>
                <span className="row m-o6 m-full" style={{ gap: 6, justifyContent: 'flex-end' }}>
                  <button className="btn sm" onClick={() => setPanel({ kind: 'edit', user: u })}>{t('edit')}</button>
                  <button className="btn sm" onClick={() => setPanel({ kind: 'reset', user: u })}>{t('resetPw')}</button>
                  {!self && <button className={'btn sm' + (u.is_active ? '' : ' primary')} onClick={() => toggleActive(u)}>{u.is_active ? t('block') : t('unblock')}</button>}
                </span>
              </div>
            );
          })}
        </div></div>
      )}</Async>
    </section>
    {panel && panel.kind === 'new' && <UserNew onClose={() => setPanel(null)} onDone={done} />}
    {panel && panel.kind === 'edit' && <UserEdit user={panel.user} onClose={() => setPanel(null)} onDone={done} />}
    {panel && panel.kind === 'reset' && <UserReset user={panel.user} onClose={() => setPanel(null)} onDone={done} />}
  </>);
}

const RoleOptions = () => ['admin', 'warehouse', 'operator'].map((r) => <option key={r} value={r}>{t('role_' + r)}</option>);
const LangOptions = () => <><option value="uz">Oʻzbekcha</option><option value="ru">Русский</option></>;

function UserNew({ onClose, onDone }) {
  const [v, setV] = useState({ name: '', login: '', role: 'operator', lang: S.lang, pw: '', must: true });
  const [bad, setBad] = useState({}); const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  async function save() {
    const login = v.login.trim().toLowerCase();
    const b = { name: v.name.trim().length < 2, login: !/^[a-z0-9][a-z0-9._-]{2,63}$/.test(login), pw: !pwOk(v.pw) };
    setBad(b); if (Object.values(b).some(Boolean)) return;
    setBusy(true); setErr(null);
    try {
      await api('POST', '/users', { body: { full_name: v.name.trim(), login, role: v.role, password: v.pw, must_change_password: v.must, lang: v.lang } });
      onDone(t('usCreated', { login }));
    } catch (e) { setBusy(false); setErr(e); }
  }
  return (
    <Layer drawer onClose={onClose}>
      <DrawerHead title={t('newUser').replace('+ ', '')} onClose={onClose} />
      <ErrBox error={err} />
      <div className="field"><label htmlFor="nuName">{t('fullName')} <span className="req">*</span></label><input className="input" id="nuName" maxLength={150} value={v.name} aria-invalid={!!bad.name} data-autofocus onChange={set('name')} /></div>
      <div className="field"><label htmlFor="nuLogin">{t('login')} <span className="req">*</span></label><input className="input mono" id="nuLogin" maxLength={64} autoCapitalize="none" spellCheck="false" value={v.login} aria-invalid={!!bad.login} onChange={set('login')} /><span className="help">{t('loginHelp2')}</span></div>
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="field"><label htmlFor="nuRole">{t('role')}</label><select className="input" id="nuRole" value={v.role} onChange={set('role')}><RoleOptions /></select></div>
        <div className="field"><label htmlFor="nuLang">{t('lang')}</label><select className="input" id="nuLang" value={v.lang} onChange={set('lang')}><LangOptions /></select></div>
      </div>
      <div className="field"><label htmlFor="nuPw">{t('tmpPw')} <span className="req">*</span></label><input className="input" id="nuPw" type="text" autoComplete="off" spellCheck="false" value={v.pw} aria-invalid={!!bad.pw} onChange={set('pw')} /><span className="help">{t('pwHelp')}</span></div>
      <label className="row small"><input type="checkbox" className="cb" checked={v.must} onChange={set('must')} />{t('mustChange')}</label>
      <div className="actions"><button className="btn primary" id="nuSave" disabled={busy} onClick={save}>{busy ? <><Spinner />{t('saving')}</> : t('save')}</button><button className="btn" onClick={onClose}>{t('cancel')}</button></div>
    </Layer>
  );
}

function UserEdit({ user: u, onClose, onDone }) {
  const { me, setMe } = useApp();
  const self = u.id === me.id;
  const [v, setV] = useState({ name: u.full_name, role: u.role, lang: u.lang });
  const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  async function save() {
    const body = {};
    if (v.name.trim() !== u.full_name) body.full_name = v.name.trim();
    if (!self && v.role !== u.role) body.role = v.role;
    if (v.lang !== u.lang) body.lang = v.lang;
    if (!Object.keys(body).length) { onClose(); return; }
    setBusy(true); setErr(null);
    try { const r = await api('PATCH', '/users/' + u.id, { body }); if (self) setMe((m) => ({ ...m, full_name: r.full_name })); onDone(t('usSaved')); } catch (e) { setBusy(false); setErr(e); }
  }
  return (
    <Layer drawer onClose={onClose}>
      <DrawerHead pre={<div className="mono small muted">{u.login}</div>} title={t('edit')} onClose={onClose} />
      <ErrBox error={err} />
      <div className="field"><label htmlFor="euName">{t('fullName')}</label><input className="input" id="euName" maxLength={150} value={v.name} data-autofocus onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
      <div className="field"><label htmlFor="euRole">{t('role')}</label><select className="input" id="euRole" value={v.role} disabled={self} onChange={(e) => setV({ ...v, role: e.target.value })}><RoleOptions /></select></div>
      <div className="field"><label htmlFor="euLang">{t('lang')}</label><select className="input" id="euLang" value={v.lang} onChange={(e) => setV({ ...v, lang: e.target.value })}><LangOptions /></select></div>
      <div className="actions"><button className="btn primary" disabled={busy} onClick={save}>{busy ? <><Spinner />{t('saving')}</> : t('save')}</button><button className="btn" onClick={onClose}>{t('cancel')}</button></div>
    </Layer>
  );
}

function UserReset({ user: u, onClose, onDone }) {
  const [a, setA] = useState(''); const [b, setB] = useState('');
  const [bad, setBad] = useState(false); const [mismatch, setMismatch] = useState(false);
  const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  async function save() {
    if (!pwOk(a)) { setBad(true); return; }
    if (a !== b) { setMismatch(true); return; }
    setBusy(true); setErr(null);
    try { await api('POST', `/users/${u.id}/reset-password`, { body: { password: a } }); onDone(t('pwSet')); } catch (e) { setBusy(false); setErr(e); }
  }
  return (
    <Layer drawer onClose={onClose}>
      <DrawerHead pre={<div className="small muted">{u.full_name} · <span className="mono">{u.login}</span></div>} title={t('resetPw')} onClose={onClose} />
      <ErrBox error={err} />
      <div className="field"><label htmlFor="rp1">{t('pcNew')}</label><input className="input" id="rp1" type="password" autoComplete="new-password" value={a} aria-invalid={bad} data-autofocus onChange={(e) => { setA(e.target.value); setBad(false); }} /><span className="help">{t('pwHelp')}</span></div>
      <div className="field"><label htmlFor="rp2">{t('pwRepeat')}</label><input className="input" id="rp2" type="password" autoComplete="new-password" value={b} aria-invalid={mismatch} onChange={(e) => { setB(e.target.value); setMismatch(false); }} />
        {mismatch && <p className="err"><Icon name="warn" size={14} />{t('pcMismatch')}</p>}</div>
      <Alert kind="info">{t('resetNote')}</Alert>
      <div className="actions"><button className="btn primary" disabled={busy} onClick={save}>{busy ? <><Spinner />{t('saving')}</> : t('setPw')}</button><button className="btn" onClick={onClose}>{t('cancel')}</button></div>
    </Layer>
  );
}

/* ---------- Print view (A4 receipt / production note) ---------- */
function PrintPage({ id }) {
  const st = useLoad(() => api('GET', '/documents/' + id), [id]);
  return <Async state={st}>{(d) => {
    const isRec = d.doc_type === 'receipt';
    const title = isRec ? t('prnReceipt') : d.doc_type === 'production' ? t('prnProduction') : t('t_' + d.doc_type);
    const head = <tr><th>№</th><th>{t('prnLine')}</th><th>{t('code')}</th><th className="n">{t('qty')}</th><th className="n">{t('kg')}</th></tr>;
    const rows = (entries) => entries.map((e, i) => (
      <tr key={e.product.id}><td>{i + 1}</td><td>{pname(e.product)}</td><td className="mono">{e.product.code}</td>
        <td className="n">{fx(Math.abs(e.qty_delta), e.product.unit)}</td><td className="n">{e.product.unit === 'g' ? fq(Math.abs(e.qty_delta), 'g') : ''}</td></tr>
    ));
    const meta = [[t('prnDoc'), d.number], [t('prnDate'), fdt(d.created_at)], [t('prnWho'), d.created_by.full_name]];
    if (isRec) {
      if (d.supplier_name) meta.push([t('supplier'), d.supplier_name]);
      if (d.supplier_doc_no || d.supplier_doc_date) meta.push([t('supDocNo'), [d.supplier_doc_no, d.supplier_doc_date ? fday(d.supplier_doc_date) : ''].filter(Boolean).join(' · ')]);
    }
    if (d.doc_type === 'production' && d.recipe_version) meta.push([t('recipeK'), `${pname(d.product)} · v${d.recipe_version.version}`]);
    if (d.note) meta.push([t('noteK'), d.note]);
    if (d.reversed_by) meta.push([t('stReversed'), d.reversed_by.number]);
    const outs = d.entries.filter((e) => e.qty_delta < 0); const ins = d.entries.filter((e) => e.qty_delta > 0);
    return (<>
      <div className="print-bar no-print">
        <button className="btn" onClick={() => { if (window.history.length > 1) window.history.back(); else go('/ledger'); }}>{t('prnBack')}</button>
        <button className="btn primary" onClick={() => window.print()}><Icon name="print" size={18} />{t('print')}</button>
      </div>
      <article className="print-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, borderBottom: '2px solid #000', paddingBottom: 12 }}>
          <div><div style={{ fontWeight: 700, fontFamily: 'var(--f-head)', fontSize: 16 }}>{t('appName')}</div><h1 style={{ marginTop: 6 }}>{title} <span className="mono">{d.number}</span></h1></div>
          <div className="mono" style={{ fontSize: 12, textAlign: 'right' }}>{fdate(d.created_at)}</div>
        </div>
        <table style={{ width: 'auto', marginTop: 14 }}><tbody>{meta.map(([k, v]) => <tr key={k}><th style={{ border: 0, padding: '3px 16px 3px 0', fontWeight: 600 }}>{k}</th><td style={{ border: 0, padding: '3px 0' }}>{v}</td></tr>)}</tbody></table>
        {isRec ? (<>
          <table><thead>{head}</thead><tbody>{rows(d.entries)}</tbody></table>
          <div className="sign"><div>{t('prnGave')}</div><div>{t('prnTook')}: {d.created_by.full_name}</div></div>
        </>) : (<>
          {ins.length > 0 && <><h3 style={{ marginTop: 18 }}>{t('prnOut')}</h3><table><thead>{head}</thead><tbody>{rows(ins)}</tbody></table></>}
          {outs.length > 0 && <><h3>{t('prnUsed')}</h3><table><thead>{head}</thead><tbody>{rows(outs)}</tbody></table></>}
          <div className="sign"><div>{t('prnMade')}: {d.created_by.full_name}</div><div>{t('prnChecked')}</div></div>
        </>)}
        <p className="mono" style={{ fontSize: 10, color: '#666', marginTop: 40 }}>request_id: {d.request_id}</p>
      </article>
    </>);
  }}</Async>;
}
