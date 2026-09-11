# Design QA

final result: passed

- Source: /Users/lisayin/.codex/generated_images/01a08488-748d-7663-afa9-f680bbecb5a5/exec-c9d87b1a-97a9-4ba7-bb06-9e1d04a43ea2.png
- Implementation: qa/desktop.png; responsive view: qa/mobile.png
- Desktop reference and capture: 1487×1058 pixels, CSS viewport 1487×1058, DPR 1; no density rescaling
- Narrow view: 390×844, DPR 1, scrollWidth equals viewport width
- State: light homepage, first preset example, no dialog

## Comparison history

Initial rendered check found the title and hero too small and the demo too high (P2). Increased desktop title from 70 to 82px, reduced left hero inset to align with reference, widened ribbon and increased hero height. Captured revised desktop and opened reference plus revised screenshot in the same tool result for direct visual comparison. No remaining P0/P1/P2 findings. Browser's first capture after viewport resize was stale; discarded and used settled capture verified with DOM dimensions.

## Fidelity surfaces

- Typography: heavy black two-line title, restrained sans-serif supporting copy. Inter with native Chinese fallback; title scale and line breaks match the selected direction. Body copy shortened deliberately to avoid overclaiming capability
- Spacing: header, left-aligned hero, right ribbon and paired example panels preserve selected hierarchy; compact example selector added below demo
- Tokens: ivory background, black CTA, gray supporting text and pale violet accents retained
- Images: separate generated high-resolution silver-lilac ribbon; not a flattened mockup. Standard icons use Phosphor. Wordmark uses a waveform icon rather than the generated concept's black ribbon mark (intentional alignment with voice product)
- Copy: no fictitious marketplace availability, unrestricted quota, or mobile download. Added real installation requirements, data flow and beta caveats in dialogs

## Interaction evidence

Browser tested MiniMax guide open/close, download dialog, correct GitHub asset href, Escape dismissal, Chinese developer example preserving 2.0/database constraints, English example, collapse/reveal result and return-to-top navigation. No browser console errors. No real microphone/model calls made; preset example labelled as such. Release assets verified via GitHub API. Narrow-screen header and main CTA remain visible, no horizontal overflow.

## Residual P3 / scope

Generated ribbon is a close stylistic recreation rather than pixel-identical. Smaller icons and minor line wraps differ from concept. Public domain deployment, ICP, live cloud polishing and marketplace acceptance remain separate unfinished work; this report certifies the website preview only.
