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

### License

Add your preferred license here before publishing publicly.
