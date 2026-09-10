# Gaussian Light Transport — project page

The project page for *Gaussian Light Transport* (SIGGRAPH Asia 2026, conference paper) by
Patrick Attimont, Kartic Subr and Cyril Soler.

Published at <https://stokastx.github.io/projects/gaussian-light-transport/>.

A single page with no framework, no build step and no JavaScript libraries — the markup, CSS and
JS are written from scratch.

**Currently on the page:** sticky nav with reading progress and scroll-spy · a hero title drawn as
a mixture of flat 2D Gaussians before it resolves into text · masthead with authors, affiliations
and link buttons · abstract · one-click BibTeX copy.

This is a trimmed starting point. The teaser clip, method figure, scene grid and comparison
sliders from the original template have been removed and are to be rebuilt; the CSS and JS that
drove them are still in place, so re-adding a section is a matter of markup.

## Still to fill in

Each of these is marked with an `EDIT ME` comment in `index.html`:

- **arXiv link** — currently a placeholder id.
- **Code link** — points at the GitHub profile; swap in the public mirror when there is one.
- **BibTeX** — a hand-written placeholder. Replace it with the official entry from the ACM
  Digital Library once the proceedings are assigned.

## Run it locally

Opening `index.html` directly works, but a local server matches how GitHub Pages serves it:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000/gaussian-light-transport/> from the repository root.
