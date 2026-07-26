# Structural Notes

Help Gabe generate engineering notes. **Do not add any material that is not prompted by Gabe.** Always use the template. Follow `/Users/gabe/Desktop/canonical docs/style-guide.md` — cockpit density, mono headings, zero ornament, maximum material per page.

## Workflow for a new note

Follow this loop every time Gabe opens the repo to start a new note.

1. **Scaffold the folder.** `cp -R template/ <slug>/` (kebab-case, e.g. `concrete-column-design`). Open `<slug>/main.tex` and substitute `<DOC-ID>` with the slug in UPPERCASE and `<NOTE TITLE>` with the subject Gabe gives.
2. **Get section names from Gabe.** Ask what sections go in if not already stated. Add only those section headers in order, bodies empty. No subsections, no placeholder prose.
3. **Compile + open on every change.** From the note folder: `pdflatex main.tex` then `open main.pdf`. Do this after each edit so Gabe sees the live result.
4. **Fill content only when prompted.** When Gabe states an equation or concept:
   - Equation in `\begin{equation}...\end{equation}`.
   - Immediately followed by a mono legend tabular (`{\ttfamily\footnotesize \begin{tabular}{@{}ll@{}} ... \end{tabular}}`) defining **only new** variables — don't re-define anything already in the doc.
   - When Gabe asks for limits, add a `\medskip{\ttfamily\footnotesize\bfseries LIMITS}` label followed by a tabular of condition-value rows, placed inside the subsection it constrains.
   - Never volunteer additional equations, variants, special cases, or commentary.
5. **Ship.** Stage the note's `main.tex` + `main.pdf` (and any new shared assets). Safety hook blocks direct pushes to main — do NOT attempt `git push origin main`. Instead:
   - `git checkout -b <slug>` → `git commit` → `git push -u origin <slug>`
   - `gh pr create --title "..." --body "..."`
   - Hand Gabe the merge command: `gh pr merge <N> --merge --delete-branch -R gabe-kafka/structural-notes`.

## Template

Source of truth lives at `template/main.tex`. Placeholders: `<DOC-ID>` (slug in UPPERCASE, appears in the footer) and `<NOTE TITLE>` (human-readable title, appears in the top-right header). Do not edit `template/main.tex` when creating a note — copy first, edit the copy. Update the template itself only to change the layout/defaults for *all* future notes.

## Conventions

- Shared logo: `structural-notes/logo.svg` is the source of truth; `logo.pdf` is the LaTeX-friendly vector build (regenerate with `rsvg-convert -f pdf logo.svg > logo.pdf` if the SVG changes). `\includegraphics{logo}` resolves to the PDF.
- Greek variables: do NOT spell out common engineering letters ($\phi$, $\lambda$, $\rho$, $\alpha$, $\beta$, $\gamma$, $\mu$, $\theta$). Gabe already knows them. For subscripted or less-common variants ($\gamma_f$, $\lambda_s$, $\varepsilon_t$), still call out on first use.
- Math: LaTeX with proper Greek letters (style guide MATH rule).
- Tables: mono tabular numerals, right-align numbers, 8pt uppercase muted headers, 0.5pt borders.
- No bold in body. No decorative headers, heroes, or padding beyond what the template sets.
