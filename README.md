## Foldable Box & Lid Layout Generator

Interactive single-page app for generating print-ready SVG die lines for a paper box and its matching lid. Everything runs in the browser—no external dependencies required.

### Features

- **Box & lid layouts** generated together so tolerances stay aligned.
- **Custom dimensions** for width, depth, height, lid height, and paper allowance in millimeters.
- **Color customization** with presets or custom hex codes to visualize your design.
- **Ink Save Mode** to minimize ink usage while keeping essential cut/fold lines visible.
- **Professional fold guidance** with distinct cut, mountain fold, and valley fold styling.
- **Optional panel labels** that rotate automatically for easy assembly reference.
- **One-click SVG export** with descriptive filenames (e.g., `UltimatePaperBoxes - 60x40x25x15 - Orange - Box.svg`) for easy organization.

### Running Locally

Open `index.html` in any modern browser—no build step needed. If you prefer a local server for testing, run something like `npx serve .` from the project root.

### Using the App

1. Enter width, depth, height, lid height, and allowance values (all mm).
2. Choose a color preset or enter a custom hex code.
3. Toggle **Show Panel Labels** if you need assembly annotations.
4. Click **Generate Box & Lid Layouts** to refresh the preview.
5. Use **Download Box SVG** or **Download Lid SVG** to save the files.

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

Distributed under the MIT License.

Copyright (c) 2025 Milan de Jong

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
