# LABOURLINK six-slide PPTX

Deliverable: `/app/frontend/public/downloads/LABOURLINK-six-slide.pptx`.

Regenerate with `python /app/presentation/build_deck.py` after editing content.

The source PDF has seven raster pages at 792 × 612 pt (landscape letter), not 16:9. The first six template backgrounds preserve the original fixed headings, graphic positions and footer. New text, diagrams and links are editable; template artwork remains raster. The instructions page is omitted.

The logo derives from the user-uploaded image already labeled 2026. It is cropped/rearranged into the template's original logo area without changing the year. This does not establish approval by the event organizer. No AI-generated media was used.

Sources and credits:
- User-provided `sih formet.pdf` template, stored in `/app/source-assets/template.pdf`.
- User-provided 2026 image, stored in `/app/source-assets/sih-2026-user-supplied.png`.
- Verification and settlement screenshot excerpts from the LABOURLINK synthetic local prototype; these are not production/pilot screenshots.
- Research hyperlinks: Ministry of Cooperation NCD, Haryana Labourfed, ICA cooperative identity, e-Shram FAQs.

Required confirmation fields are deliberately not invented: registered Team ID, exact team spelling, PS portal URL, six final prototype URLs and official branding approval. The source template requests PDF for portal submission, while this user requested PPTX only. Internal PDFs in `review/` are rendered quality checks and are not the requested deliverable.

Validation: `/app/test_reports/iteration_1.json` confirms exactly six slides, template geometry, hyperlink targets, clean rendered layouts and a valid public PPTX download. App feature testing was explicitly outside that validation scope.