# Visual Self Portrait

An interactive self-portrait told through a lab microscope. You walk through a door into a lab,
place three glass slides under the microscope, one per city, and turn the magnification from the
place, to a moment, to the neurochemistry underneath.

| Slide | City | ×4 / ×10 | ×40 |
|---|---|---|---|
| **SCL** | Santiago, Chile | family, childhood | a neural web firing **oxytocin** |
| **YYZ** | Toronto, Canada | muted, dim photos | a web filling with **cortisol**, then 2:13 AM and the **noradrenaline → adrenaline** breaking point (a panic attack) |
| **MAD** | Madrid, Spain | friends, joy | **BDNF** docking on neurons that grow back |

Each ×40 view has a note with the chemical's name, formula and function. The lab notebook beside
the microscope holds the experimental notes: the chemical equations for each transition.

## How to use it

1. Click the door to enter the lab.
2. Click a slide to place it on the microscope (in order: SCL, YYZ, MAD). Click the slide on the stage to put it back.
3. Click the eyepieces at the top of the microscope to look through it.
4. Click the image, scroll, drag the wheel on the right, or press ↑ / ↓ to change magnification (×4, ×10, ×40).
5. Click the notebook to the right of the microscope to read the notes.
6. Esc or ✕ steps back from the microscope.

Rehearsal tip: add `?crisis=5` to the end of the address to change how many seconds YYZ ×40 waits
before 2:13 AM (default 9).

## Files

```
index.html            page structure
favicon.svg           browser-tab icon
css/style.css         all styling (door, eyepiece view, wheel, notes, notebook)
js/main.js            story data, eyepiece scenes, lens transitions, door, notes, breaking point
js/microscope.js      the 3D lab (three.js): room, bench, microscope, slide tray, notebook
images/<city>/        slide photos: x4.jpg, x10.jpg, and small copies in thumbs/ for the 3D slides
images/notebook/      the notebook scan and its paper texture
Open preview.command  Mac helper to preview the site locally (double-click)
.nojekyll             tells GitHub Pages to serve the files exactly as they are
```

To change a photo, replace the file in `images/<city>/` and its copy in `images/<city>/thumbs/`
(same name), or edit the `places` list at the top of `js/main.js`.

After editing `css/style.css` or a file in `js/`, change the `?v=` date at the end of its link in
`index.html`, so browsers load the new version instead of a cached one.

## Previewing it on your computer

Opening `index.html` directly (a `file://` address) won't show the 3D lab: browsers block it that way.

- **Mac:** double-click **`Open preview.command`**. It starts a small local server and opens the site.
  The first time, macOS may block it: right-click it, choose **Open**, then **Open** again.
  Close the Terminal window to stop it.
- **Any computer, from a terminal in this folder:** `python3 -m http.server 8000`, then open http://localhost:8000.

## Publishing on GitHub Pages

### 1. Create the repository
1. Sign in at https://github.com and click **+ → New repository** (top right).
2. Name it, e.g. `visual-self-portrait`. Set it to **Public** (free GitHub Pages needs a public repository).
3. Leave "Add a README" unticked (this folder already has one), then click **Create repository**.

### 2. Upload the files
1. On the new repository's page, click **uploading an existing file**.
2. Open this folder in Finder, select **everything inside it** (`index.html`, `favicon.svg`, `README.md`,
   `Open preview.command`, and the `css`, `js` and `images` folders) and drag it into the browser window.
   Upload the *contents*, not the folder itself, so that `index.html` ends up at the top level of the repository.
3. Click **Commit changes**.

Finder hides files that start with a dot (`.nojekyll`, `.gitignore`), so they won't be uploaded this way.
That's fine: the site works without them.

### 3. Turn on Pages
1. In the repository, go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Set the branch to **main** and the folder to **/ (root)**, then click **Save**.
4. After a minute or two, the address appears at the top of that page:
   `https://<your-username>.github.io/visual-self-portrait/`

### Updating it later
Upload changed files the same way (**Add file → Upload files**), and they replace the old ones.
Remember to bump the `?v=` date in `index.html` when you change CSS or JS.
Pages rebuilds automatically within a minute or two.

## Notes

- There's no build step. three.js, d3 and the fonts load from public CDNs, so viewers need an internet connection.
- Location data (GPS) has been removed from the photos.
- The photos and notes are personal; all rights reserved.
