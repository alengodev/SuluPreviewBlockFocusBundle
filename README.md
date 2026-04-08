# SuluPreviewBlockFocusBundle

Sulu CMS bundle that enables click-to-edit in the preview iframe: hovering a block shows a focus button, clicking it scrolls to and expands the corresponding block in the admin form.

> **This is the 2.x branch for Sulu 2.x / Symfony 6.x.**
> For Sulu 3.x use the `3.x` branch.

## Features

- Hover overlay with focus button on blocks in the preview iframe
- Clicking the button scrolls to the block in the admin form and expands it
- Supports segment and webspace filtering
- Twig function `sulu_user_loggedin_and_preview` to conditionally include the preview script

## Requirements

- PHP 8.1+
- Sulu CMS 2.6+
- Symfony 6.4+

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

### HTML element — Segment & Webspace attributes

When Sulu **segments** are used, the website JS reads the active segment and webspace from `data-sulu-segment` and `data-sulu-webspace` attributes on the `<html>` element. Without these attributes the bundle still works, but segment-filtered blocks will not be correctly excluded from the count.

Add the attributes to the `<html>` tag in your main layout (e.g. `index.html.twig`):

```twig
{% set dataSuluAttributes = sulu_user_loggedin_and_preview(app.request)
    ? ' data-sulu-segment="' ~ app.request.attributes.get('_sulu').getAttributes()['segment'].key|default ~ '"'
    ~ ' data-sulu-webspace="' ~ request.webspaceKey|default ~ '"'
    : '' %}

<html lang="{{ app.request.locale|split('_')[0] }}"{{ dataSuluAttributes|raw }}>
```

### Block markup

Add `data-block-id` with the format `blockType-counter` (1-based count of that block type on the page):

```twig
<div{{ (sulu_user_loggedin_and_preview(app.request) ? ' data-block-id="' ~ block.type ~ '-' ~ counter(block.type)|default ~ '"')|raw }}>
```

The block type and counter must match what the admin JS expects — it reads `props.value.type` from React fiber and counts visible, non-hidden blocks per type. Hidden blocks (`settings.hidden`) and blocks filtered out by segment are excluded from the count.

## How it works

**Website side** (`assets/website/index.js`): Runs inside the Sulu preview iframe. Reads the active segment and webspace from `data-sulu-segment` / `data-sulu-webspace` attributes on `<html>`. On block hover the outermost `[data-block-id]` element is highlighted. On click, posts a `sulu-preview-block-click` message with `id`, `segment`, and `webspace` to the parent window.

**Admin side** (`assets/admin/index.js`): Listens for `sulu-preview-block-click` messages. Parses the `blockType-counter` id, uses React fiber introspection to find the matching block (skipping hidden and segment-filtered blocks), collapses other open blocks, expands the target, and scrolls to it.
