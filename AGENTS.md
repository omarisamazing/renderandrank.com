Always Use:
- astro, tailwind-4-docs, web-design-guidelines, copywriting, grill-me these 5 skills for this project
- Design with `DESIGN.md` file

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Documentation & commit workflow

- Before starting work, read `PROGRESS.md` and `ARCHITECTURE.md`.
- When code changes, update the relevant docs in the SAME change (`ARCHITECTURE.md` and/or the matching `docs/*.md`) and add a `CHANGELOG.md` entry under Unreleased.
- Keep changes small; after each logical unit, run `git add -A && git commit -m "<message>" && git push` so nothing stays unpushed.
- At the end of every session (or before a possible interruption), update `PROGRESS.md` (Done / In progress / Next up / Unapplied migrations) and commit and push it, so the next session resumes with no context loss and no uncommitted work.
- Whenever a migration is added, record it under `PROGRESS.md` "Unapplied migrations / manual steps" until it has been applied to BOTH local and remote D1.
