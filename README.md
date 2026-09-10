# projects

Project pages for my publications, served from GitHub Pages at
**<https://stokastx.github.io/projects/>**.

## Layout

One directory per publication, each a self-contained static page:

```
projects/
├── .nojekyll                     # serve the tree as-is, no Jekyll build
├── LICENSE
└── gaussian-light-transport/     # → /projects/gaussian-light-transport/
    ├── index.html
    └── static/
        ├── css/style.css
        ├── js/main.js
        ├── images/
        └── paper/paper.pdf
```

The directory name is the URL slug, so `gaussian-light-transport/` is served at
<https://stokastx.github.io/projects/gaussian-light-transport/>. Adding a publication means
adding a directory — nothing else in the repo needs to change.

Every path inside a project page is relative (`./static/...`), so a page works unchanged whether
it is opened from disk, served locally, or served from the `/projects/<slug>/` subpath.

There is no page at the repo root yet; only the individual project URLs resolve.

## Publications

| Slug | Paper | Venue |
| --- | --- | --- |
| [`gaussian-light-transport`](./gaussian-light-transport/) | Gaussian Light Transport | SIGGRAPH Asia 2026 |

## Run a page locally

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000/gaussian-light-transport/>.

## Deployment

**Settings → Pages → Source: Deploy from a branch → `main` / `(root)`.** Pushing to `main`
publishes; there is no build step.

## Licence

The page markup, styles and scripts are released under
[CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/), inherited from the
[Nerfies](https://github.com/nerfies/nerfies.github.io) project page whose structure they follow.
Papers and figures remain under their respective publishers' terms.
