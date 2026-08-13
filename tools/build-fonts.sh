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

# Noto Sans Arabic ships variable on both wght and wdth. Nothing in the design
# tokens varies font-stretch, so the wdth axis is dead weight in gvar; pin it
# to its default (100, normal) before subsetting. This only removes variation
# data for a dimension the site never uses — it does not touch glyph outlines,
# GSUB/GPOS, or the wght range, so nothing user-visible changes.
python3 -m fontTools.varLib.instancer \
  "$FONTS/Noto_Sans_Arabic/NotoSansArabic-VariableFont_wdth,wght.ttf" \
  wdth=100 \
  -o "$WORK/noto-sans-arabic-wght-only.ttf"

# U+0000-00FF (Latin) is deliberately excluded: css/tokens.css's unicode-range
# for this face never includes the Latin block, so the browser never selects
# this face for Latin runs in Arabic text (Inter covers those) — embedding
# Latin glyphs here would be dead weight. U+FB50-FDFF (Arabic Presentation
# Forms-A) is excluded too: it is a ~600-codepoint legacy compatibility block
# for precomposed glyphs that ordinary authored Arabic text never contains,
# since normal shaping goes through GSUB (init/medi/fina/rlig, kept below via
# --layout-features='*') from the base Arabic blocks. Dropping both keeps the
# font joined and correct for all real content while fitting the size budget.
"${PYFTSUBSET[@]}" "$WORK/noto-sans-arabic-wght-only.ttf" \
  --output-file="$OUT/noto-sans-arabic-subset.woff2" \
  --flavor=woff2 --layout-features='*' --no-hinting \
  --unicodes='U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FE70-FEFF,U+200C-200F,U+2000-206F,U+FEFF'

ls -l "$OUT"
