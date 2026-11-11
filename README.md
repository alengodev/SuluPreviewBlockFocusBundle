# SuluPreviewBlockFocusBundle

Sulu CMS bundle that links blocks in the preview iframe and the admin form in both directions:

- **Preview → Admin**: hovering a block in the preview shows a focus button; clicking it scrolls to and expands the corresponding block in the admin form.
- **Admin → Preview**: an eye button in the header of an expanded block scrolls the preview to that block.

## Features

- Hover overlay (stripe + focus button) on blocks in the preview iframe
- Clicking the focus button scrolls to the block in the admin form and expands it
- Supports nested blocks (sends parent IDs first, child last)
- Eye button (`su-eye`) left of the action buttons (more, settings, collapse) of an expanded block in the admin form:
  - only shown while the preview is open and the block is visible in it
  - clicking it scrolls the preview to the block (centered; blocks taller than the viewport are aligned to the top) and marks it with the hover stripe
- Works with Sulu's preview updates (`document.open/write`) and with the preview being closed and reopened
- Messages are only accepted from the preview iframe / admin window of the same origin
- Twig function `sulu_user_loggedin_and_preview` to conditionally include the preview script

## Requirements

- PHP 8.2+
- Sulu CMS 3.1+
- Symfony 7.0 or 8.0

## Installation

```bash
composer require alengo/sulu-preview-block-focus-bundle
```

Register the bundle in `config/bundles.php`:

```php
Alengo\SuluPreviewBlockFocusBundle\PreviewBlockFocusBundle::class => ['all' => true],
```

### Admin JS

**1.** Add to `assets/admin/package.json` under `dependencies`:

```json
"sulu-preview-block-focus-bundle": "file:../../vendor/alengo/sulu-preview-block-focus-bundle/assets/admin"
```

**2.** Install the dependency:

```bash
cd assets/admin && npm install
```

**3.** Import in `assets/admin/app.js`:

```js
import 'sulu-preview-block-focus-bundle';
```

**4.** Rebuild the admin:

```bash
cd assets/admin && npm run build
```

### Website JS (Webpack Encore)

Add an entry in `webpack.config.js`:

```js
.addEntry('suluPreviewBlockFocus', './vendor/alengo/sulu-preview-block-focus-bundle/assets/website/index.js')
```

Include the script conditionally in your Twig layout (only in Sulu preview context):

```twig
{% if sulu_user_loggedin_and_preview(app.request) %}
    {{ encore_entry_script_tags('suluPreviewBlockFocus', null, 'baseConfig', attributes={
        'defer': false,
        'async': true
    }) }}
{% endif %}
```

### Block markup

Add `data-block-id` conditionally — only when rendering in the Sulu preview context:

```twig
<div{{ (sulu_user_loggedin_and_preview(app.request) ? ' data-block-id="' ~ content._id|default ~ '"')|raw }}>
```

This ensures `data-block-id` is only rendered inside the preview iframe and never exposed on the public website.

## How it works

### Preview → Admin (click-to-edit)

**Website side** (`assets/website/index.js`): Runs inside the Sulu preview iframe. On block hover, a stripe and a focus button appear. On click, it posts a `sulu-preview-block-click` message with the block UUID to the parent window (for nested blocks: parent IDs first, child last).

**Admin side** (`assets/admin/index.js`): Listens for `sulu-preview-block-click` messages. Finds the matching block in the admin form, collapses other open blocks, expands the target block and scrolls to it.

### Admin → Preview (scroll to block)

1. The preview script reports the IDs of all visible `[data-block-id]` elements to the admin (`sulu-preview-visible-blocks`) — on load, on DOM changes (debounced) and on resize, only when the list changed.
2. The admin injects an eye button (`su-eye`) as first item of the action buttons of every expanded block whose ID was reported. Buttons are re-added after React re-renders and removed when the block is no longer visible or the preview is closed.
3. Clicking the button posts `sulu-preview-block-scroll` to the preview, which scrolls the block into view and shows the hover stripe and focus button on it.

A block counts as **visible** when it has a size (also for `display: contents` wrappers), is not `visibility: hidden` and is not inside a collapsed container (zero-size ancestor with `overflow` other than `visible`, e.g. a closed accordion or tab). `opacity` is ignored on purpose, as it is commonly used for transitions and reveal effects.

### Block identification

The admin reads the block UUID from Sulu's `data-sulu-block-id` attribute on the block section (Sulu 3.1+) and falls back to React fiber introspection (`value._id` of `SortableBlock`).

### Messages

| Type | Direction | Payload |
|---|---|---|
| `sulu-preview-block-click` | Preview → Admin | `{id}` — block UUID to expand in the form |
| `sulu-preview-visible-blocks` | Preview → Admin | `{ids}` — UUIDs of all blocks visible in the preview |
| `sulu-preview-block-scroll` | Admin → Preview | `{id}` — block UUID to scroll to |

Both sides only accept messages from the expected window (admin: an iframe of the current page with the same origin; preview: `window.parent`).
