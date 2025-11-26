## Foldable Box & Lid Layout Generator

Interactive single-page app for generating print-ready SVG die lines for a paper box and its matching lid. Everything runs in the browser—no external dependencies required.

### Features

- **Box & lid layouts** generated together so tolerances stay aligned.
- **Custom dimensions** for width, depth, height, lid height, and paper allowance in millimeters.
- **Professional fold guidance** with distinct cut, mountain fold, and valley fold styling.
- **Optional panel labels** that rotate automatically for easy assembly reference.
- **One-click SVG export** buttons that preserve real-world mm sizing in downstream design tools.

### Running Locally

Open `index.html` in any modern browser—no build step needed. If you prefer a local server for testing, run something like `npx serve .` from the project root.

### Using the App

1. Enter width, depth, height, lid height, and allowance values (all mm).
2. Toggle **Show Panel Labels** if you need assembly annotations.
3. Click **Generate Box & Lid Layouts** to refresh the preview.
4. Use **Download Box SVG** or **Download Lid SVG** to save the files.

### Hosting on GitHub Pages

1. Commit the repository with `index.html` at the root.
2. Push to GitHub and enable **Settings → Pages → Deploy from branch → main / root**.
3. After the first deploy (≈1 minute), your app is live at `https://<username>.github.io/<repo>/`.

### Folding Instructions

These boxes were designed for easy cutting, easy folding, and they go together without any glue, so you can jump straight from printout to finished container.

#### Forgiving Construction
The panels naturally square themselves as you crease them, so minor crooked folds will pull back into alignment and the walls stiffen quickly once everything is locked in place.

#### Folding Order
1. Fold in the two small side panels first to define the box edges.
2. Fold the back panel, including its small flap, to anchor the sides.
3. Finish with the front panel that has the longer flap, tucking that flap toward the interior (bottom or lid top) to lock the shape.

> Note: A small piece of transparent tape on each side flap can help them stay perfectly flush if the paper stock is especially springy.

### License

Add your preferred license here before publishing publicly.
