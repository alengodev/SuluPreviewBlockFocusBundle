# SuluPreviewBlockFocusBundle

Sulu CMS bundle that enables click-to-edit in the preview iframe: hovering a block shows a focus button, clicking it scrolls to and expands the corresponding block in the admin form.

## Features

- Hover overlay with focus button on blocks in the preview iframe
- Clicking the button scrolls to the block in the admin form and expands it
- Supports nested blocks (sends parent IDs first, child last)
- Twig function `sulu_user_loggedin_and_preview` to conditionally include the preview script

## Requirements

- PHP 8.2+
- Sulu CMS 3.0+
- Symfony 7.0+

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

**Website side** (`assets/website/index.js`): Runs inside the Sulu preview iframe. On block hover, a focus button appears. On click, it posts a `sulu-preview-block-click` message with the block UUID to the parent window.

**Admin side** (`assets/admin/index.js`): Listens for `sulu-preview-block-click` messages. Uses React fiber introspection to find the matching block in the admin form, collapses other open blocks, expands the target block, and scrolls to it.
