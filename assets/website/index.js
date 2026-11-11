(function() {
    if (window.parent === window) return;

    // Guard against double initialisation per document. Sulu rewrites the preview with
    // document.open/write: the window (and its globals) survive, the <html> element does not.
    const root = document.documentElement;
    if (!root || root.__suluPreviewBlockFocus) return;
    root.__suluPreviewBlockFocus = true;

    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);

    function init() {
        const icon = document.createElement('button');
        const titles = { de: 'Block fokussieren', en: 'Focus block', it: 'Focalizza blocco' };
        icon.title = titles[document.documentElement.lang] || titles.de;
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M288-16c8.8 0 16 7.2 16 16l0 32.6C415 40.4 503.6 129 511.4 240l32.6 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-32.6 0C503.6 383 415 471.6 304 479.4l0 32.6c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-32.6C161 471.6 72.4 383 64.6 272L32 272c-8.8 0-16-7.2-16-16s7.2-16 16-16l32.6 0C72.4 129 161 40.4 272 32.6L272 0c0-8.8 7.2-16 16-16zM96.7 272c7.7 93.3 82.1 167.6 175.3 175.3l0-47.3c0-8.8 7.2-16 16-16s16 7.2 16 16l0 47.3c93.3-7.7 167.6-82.1 175.3-175.3L432 272c-8.8 0-16-7.2-16-16s7.2-16 16-16l47.3 0C471.6 146.7 397.3 72.4 304 64.7l0 47.3c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-47.3C178.7 72.4 104.4 146.7 96.7 240l47.3 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-47.3 0zM288 232a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/></svg>';

        Object.assign(icon.style, {
            position: 'absolute',
            zIndex: '9999',
            width: '27px',
            height: '26px',
            padding: '4px 2px 2px',
            background: '#6db4c7',
            border: 'none',
            borderRadius: '0px 2px 2px 0px',
            cursor: 'pointer',
            display: 'none',
            alignItems: 'flex-start',
            justifyContent: 'center',
        });

        const svg = icon.querySelector('svg');
        svg.style.cssText = 'fill:#fff;width:16px;height:16px;flex-shrink:0;pointer-events:none';

        document.body.appendChild(icon);

        const stripe = document.createElement('div');
        Object.assign(stripe.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '6px',
            height: '100%',
            background: 'rgba(109,180,199,0.2)',
            zIndex: '9998',
            cursor: 'pointer',
        });

        const style = document.createElement('style');
        style.textContent = '[data-block-id].sulu-block-active{position:relative}';
        document.head.appendChild(style);

        let activeBlock = null;

        // Target origin of the admin window. The preview is same-origin in Sulu, so the parent's
        // origin is readable; fall back to ancestorOrigins / referrer and finally '*'.
        function getParentOrigin() {
            try {
                return window.parent.location.origin;
            } catch (e) {
                if (window.location.ancestorOrigins && window.location.ancestorOrigins.length) return window.location.ancestorOrigins[0];
                try {
                    return new URL(document.referrer).origin;
                } catch (e2) {
                    return '*';
                }
            }
        }

        function postToParent(message) {
            window.parent.postMessage(message, getParentOrigin());
        }

        function postBlockClick(id) {
            postToParent({ type: 'sulu-preview-block-click', id });
        }

        function triggerClick() {
            if (!activeBlock) return;

            // Collect ancestor block IDs from outermost to innermost
            const path = [];
            let el = activeBlock;
            while (el) {
                path.unshift(el.dataset.blockId);
                el = el.parentElement && el.parentElement.closest('[data-block-id]');
            }

            // Send parent IDs first, child last — admin needs ~300ms per level to expand
            path.forEach(function(id, index) {
                setTimeout(function() { postBlockClick(id); }, index * 50);
            });
        }

        function showIcon(block) {
            if (activeBlock !== block) {
                if (activeBlock) {
                    activeBlock.classList.remove('sulu-block-active');
                    if (stripe.parentNode === activeBlock) activeBlock.removeChild(stripe);
                }
                activeBlock = block;
                block.classList.add('sulu-block-active');
            }
            if (stripe.parentNode !== block) block.appendChild(stripe);

            const rect = block.getBoundingClientRect();
            icon.style.top = (rect.top + window.scrollY) + 'px';
            icon.style.left = (rect.left + window.scrollX) + 'px';
            icon.style.display = 'flex';
        }

        function hideIcon() {
            if (activeBlock) {
                activeBlock.classList.remove('sulu-block-active');
                if (stripe.parentNode === activeBlock) activeBlock.removeChild(stripe);
            }
            activeBlock = null;
            icon.style.display = 'none';
        }

        document.addEventListener('mouseenter', function(e) {
            if (e.target === stripe || e.target === icon) return;
            const block = e.target instanceof Element && e.target.closest('[data-block-id]');
            if (block) showIcon(block);
        }, true);

        document.addEventListener('mouseleave', function(e) {
            if (e.relatedTarget === icon || e.relatedTarget === stripe) return;
            const block = e.target instanceof Element && e.target.closest('[data-block-id]');
            if (block && block === activeBlock) {
                const toBlock = e.relatedTarget instanceof Element && e.relatedTarget.closest('[data-block-id]');
                if (toBlock && toBlock !== block) showIcon(toBlock);
                else if (!toBlock) hideIcon();
            }
        }, true);

        icon.addEventListener('mouseleave', function(e) {
            if (e.relatedTarget === stripe) return;
            const toBlock = e.relatedTarget instanceof Element && e.relatedTarget.closest('[data-block-id]');
            if (toBlock) showIcon(toBlock);
            else hideIcon();
        });

        stripe.addEventListener('mouseleave', function(e) {
            if (e.relatedTarget === icon) return;
            const toBlock = e.relatedTarget instanceof Element && e.relatedTarget.closest('[data-block-id]');
            if (toBlock) showIcon(toBlock);
            else hideIcon();
        });

        icon.addEventListener('click', triggerClick);
        stripe.addEventListener('click', triggerClick);

        // Report visible blocks to the admin, so it only shows the "scroll to block" button
        // for blocks that are actually rendered in the preview.
        // A block counts as visible when it takes up space, is not visibility:hidden and is not
        // clipped away by a collapsed ancestor (e.g. a closed accordion or tab). Opacity is
        // ignored on purpose: it is commonly used for transitions and reveal effects.
        function getRect(el) {
            const rect = el.getBoundingClientRect();
            if ((rect.width > 0 && rect.height > 0) || window.getComputedStyle(el).display !== 'contents') return rect;

            // display:contents has no box of its own: use the union of its children.
            let top = Infinity, left = Infinity, bottom = -Infinity, right = -Infinity;
            for (let i = 0; i < el.children.length; i++) {
                const r = getRect(el.children[i]);
                if (r.width <= 0 || r.height <= 0) continue;
                top = Math.min(top, r.top); left = Math.min(left, r.left);
                bottom = Math.max(bottom, r.bottom); right = Math.max(right, r.right);
            }
            if (top === Infinity) return rect;
            return { top, left, bottom, right, width: right - left, height: bottom - top };
        }

        function isVisible(el) {
            const rect = getRect(el);
            if (rect.width <= 0 || rect.height <= 0) return false;

            const visibility = window.getComputedStyle(el).visibility;
            if (visibility === 'hidden' || visibility === 'collapse') return false;

            for (let node = el.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
                if (window.getComputedStyle(node).overflow === 'visible') continue;
                const clip = node.getBoundingClientRect();
                if (clip.width <= 0 || clip.height <= 0) return false;
            }
            return true;
        }

        let lastReported = null;

        function reportVisibleBlocks() {
            const ids = [];
            document.querySelectorAll('[data-block-id]').forEach(function(el) {
                const id = el.dataset.blockId;
                if (id && ids.indexOf(id) === -1 && isVisible(el)) ids.push(id);
            });
            const key = ids.join(',');
            if (key === lastReported) return;
            lastReported = key;
            postToParent({ type: 'sulu-preview-visible-blocks', ids });
        }

        let reportTimer = null;

        function scheduleReport() {
            clearTimeout(reportTimer);
            reportTimer = setTimeout(reportVisibleBlocks, 100);
        }

        new MutationObserver(function(mutations) {
            for (let i = 0; i < mutations.length; i++) {
                const t = mutations[i].target;
                if (t === icon || t === stripe || mutations[i].attributeName === 'class' && t === activeBlock) continue;
                scheduleReport();
                return;
            }
        }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
        window.addEventListener('resize', scheduleReport);
        window.addEventListener('load', reportVisibleBlocks);
        reportVisibleBlocks();

        window.addEventListener('message', function(event) {
            const data = event.data;
            if (event.source !== window.parent || !data || data.type !== 'sulu-preview-block-scroll' || typeof data.id !== 'string' || !data.id) return;
            const blocks = document.querySelectorAll('[data-block-id]');
            for (let i = 0; i < blocks.length; i++) {
                if (blocks[i].dataset.blockId === data.id && isVisible(blocks[i])) {
                    // Center the block; blocks taller than the viewport are aligned to the top instead.
                    const fits = blocks[i].getBoundingClientRect().height <= window.innerHeight;
                    blocks[i].scrollIntoView({ behavior: 'smooth', block: fits ? 'center' : 'start' });
                    // Mark the block with the same stripe + focus button as on hover.
                    showIcon(blocks[i]);
                    return;
                }
            }
        });
    }
})();
