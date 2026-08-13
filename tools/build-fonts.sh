#!/usr/bin/env bash
set -euo pipefail
OUT="$(cd "$(dirname "$0")/.." && pwd)/assets/fonts"
FONTS="$HOME/.local/share/fonts"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# This machine's fonttools RPM ships the fontTools.subset module but not the
# pyftsubset console-script wrapper; `python3 -m fontTools.subset` is the same
# entry point (fontTools.subset:main) and takes identical flags.
PYFTSUBSET=(python3 -m fontTools.subset)

mkdir -p "$OUT"

"${PYFTSUBSET[@]}" "$FONTS/Inter/Inter[opsz,wght].ttf" \
  --output-file="$OUT/inter-subset.woff2" \
  --flavor=woff2 --layout-features='*' --no-hinting \
  --unicodes='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'

# IBM Plex Sans Arabic ships as static weights, not a variable font, so each
# weight is subset separately. Only the three the design actually paints are
# built: 400 body copy, 600 UI labels, 700 headings and <th>. Adding a weight
# here without a matching @font-face in css/tokens.css ships dead bytes.
#
# U+0000-00FF (Latin) is deliberately excluded: this face's unicode-range never
# claims the Latin block, so the browser never selects it for the Latin runs
# inside Arabic sentences (Inter covers those) — embedding Latin glyphs would be
# dead weight.
#
# --layout-features='*' is mandatory, not optional. Arabic shaping is entirely
# GSUB-driven (init/medi/fina/rlig): drop the features and every word renders as
# disconnected, isolated letterforms.
for pair in Regular:400 SemiBold:600 Bold:700; do
  name="${pair%%:*}"
  weight="${pair##*:}"
  "${PYFTSUBSET[@]}" "$FONTS/IBM_Plex_Sans_Arabic/IBMPlexSansArabic-$name.ttf" \
    --output-file="$OUT/ibm-plex-sans-arabic-$weight.woff2" \
    --flavor=woff2 --layout-features='*' --no-hinting \
    --unicodes='U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF'
done

ls -l "$OUT"
