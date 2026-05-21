# asuka-frontend

Interface React (Vite + TanStack Router) pour **Asuka One**.

## Stack

- **Build** : Vite 7 + TypeScript
- **Router** : TanStack Router (SPA mode, fichiers auto-générés)
- **UI** : Tailwind CSS v4 + Radix UI + shadcn/ui
- **Auth** : Supabase (email/password + OAuth Google)
- **State** : TanStack Query + React context
- **i18n** : Français / Anglais intégré

## Démarrage rapide

```bash
cd asuka-frontend
cp .env.example .env          # Remplir les variables Supabase
npm install
npm run dev                    # Lance sur http://localhost:3000
```

> En dev, les appels `/api/*` sont automatiquement proxiés vers `http://localhost:4000` (asuka-server). Lance les deux en parallèle.

## Variables d'environnement

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL de ton projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé anon/public Supabase |
| `VITE_API_URL` | URL du backend en production (ex: `https://api.asuka-one.com`) |

> `VITE_API_URL` peut être vide en dev grâce au proxy Vite.

## Structure

```
src/
├── main.tsx              # Point d'entrée SPA
├── router.tsx            # Config TanStack Router
├── styles.css            # Tailwind + variables CSS
├── assets/               # Logos, illustrations
├── components/
│   ├── asuka/            # Composants métier (AppShell, Logo…)
│   └── ui/               # shadcn/ui (accordion, button, card…)
├── context/
│   └── AuthProvider.tsx  # Session Supabase
├── hooks/                # use-mobile, useIsAdmin
├── i18n/                 # Traductions FR/EN
├── integrations/
│   └── supabase/         # Client Supabase + types générés
├── lib/
│   ├── api.ts            # Client HTTP → asuka-server
│   ├── asuka-actions.ts  # XP, notifications, badges
│   ├── asuka-data.ts     # Données statiques (opportunités, pulses)
│   ├── matching.ts       # Algo de matching local
│   └── profile-completion.ts
└── routes/
    ├── __root.tsx        # Layout racine (providers)
    ├── index.tsx         # Page d'accueil
    ├── auth.tsx          # Login / inscription
    ├── onboarding.tsx    # Onboarding
    └── _app/             # Pages authentifiées
        ├── dashboard.tsx
        ├── profile.tsx
        ├── coach.tsx
        ├── opportunities.tsx
        ├── pulse.tsx
        ├── rewards.tsx
        ├── admin.tsx
        └── …
```

## Appels vers le backend

Utilise `src/lib/api.ts` pour tous les appels vers asuka-server :

```ts
import { callCoach, callProfileAI } from "@/lib/api";

// Streaming coach
const stream = await callCoach(messages, "fr", profile);

// Analyse profil
const result = await callProfileAI({ action: "analyze_profile", profile });
```

## Build & déploiement

```bash
npm run build    # Génère dist/
```

Le dossier `dist/` est un SPA statique déployable sur :
- **Netlify** / **Vercel** / **Cloudflare Pages** : drag & drop ou CI
- **VPS** : servi par nginx avec `try_files $uri /index.html`

Configure `VITE_API_URL` avec l'URL de production d'asuka-server.
