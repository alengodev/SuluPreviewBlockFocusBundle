// Preview block click-to-edit: clicking a block in the preview iframe scrolls to
// the corresponding block in the admin form and expands it.

// Read block UUID from SortableBlock's value._id prop.
// SortableBlockList passes value={block} to SortableElementBlock → SortableBlock.
// Fiber chain: section → Block (1 hop) → SortableBlock (2 hops) → has props.value._id.
let cachedFiberKey = null;

function getFiberKey(el) {
    if (cachedFiberKey) return cachedFiberKey;
    cachedFiberKey = Object.keys(el).find(function(k) {
        return k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance');
    }) || null;
    return cachedFiberKey;
}

function getBlockUuidFromSection(section) {
    // Sulu >= 3.1 renders the block UUID as data-sulu-block-id on the block section.
    const navigationId = section.getAttribute('data-sulu-block-id');
    if (navigationId) return navigationId;

    const fiberKey = getFiberKey(section);
    if (!fiberKey) return null;
    let fiber = section[fiberKey] || section[Object.keys(section).find(function(k) {
        return k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance');
    })];
    let hops = 0;
    while (fiber && hops < 5) {
        const props = fiber.memoizedProps || fiber.pendingProps;
        if (props && props.value && typeof props.value._id === 'string' && props.value._id) {
            return props.value._id;
        }
        fiber = fiber.return;
        hops++;
    }
    return null;
}

function getScrollContainer(el) {
    let node = el.parentElement;
    while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const overflow = style.overflowY || style.overflow;
        if ((overflow === 'auto' || overflow === 'scroll') && node.scrollHeight > node.clientHeight) {
            return node;
        }
        node = node.parentElement;
    }
    return document.documentElement;
}

// Only accept messages from an iframe of this document with the admin's origin (the Sulu
// preview is same-origin).
function isFromPreviewFrame(event) {
    if (event.origin !== window.location.origin || !event.source) return false;
    const frames = document.querySelectorAll('iframe');
    for (let i = 0; i < frames.length; i++) {
        if (frames[i].contentWindow === event.source) return true;
    }
    return false;
}

window.addEventListener('message', function(event) {
    const data = event.data;
    if (!data || data.type !== 'sulu-preview-block-click' || typeof data.id !== 'string' || !data.id) return;
    if (!isFromPreviewFrame(event)) return;

    const allSections = document.querySelectorAll('[class*="sortableBlockList"] section[role="switch"]');
    let target = null;
    let targetIndex = -1;

    for (let i = 0; i < allSections.length; i++) {
        if (getBlockUuidFromSection(allSections[i]) === event.data.id) {
            target = allSections[i];
            targetIndex = i;
            break;
        }
    }

    if (!target) return;

    function scrollToTarget() {
        const scrollContainer = getScrollContainer(target);
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop + (targetRect.top - containerRect.top) - 10;
        scrollContainer.scrollTo({top: scrollTop, behavior: 'smooth'});
    }

    const isExpanded = !!target.querySelector('[aria-label="su-collapse-vertical"]');

    if (isExpanded) {
        // Already open — just scroll, no collapse/expand needed
        requestAnimationFrame(scrollToTarget);
        return;
    }

    // 1. Collapse all other expanded blocks (skip ancestors of target — they must stay open)
    allSections.forEach(function(block, i) {
        if (i === targetIndex) return;
        if (block.contains(target)) return;
        const collapseBtn = block.querySelector('[aria-label="su-collapse-vertical"]');
        if (collapseBtn) collapseBtn.click();
    });

    // 2. Wait for collapse re-render, then expand target
    requestAnimationFrame(function() {
        target.click();

        // 3. Wait for expand re-render, then scroll to final position
        requestAnimationFrame(scrollToTarget);
    });
});

// Preview scroll: an eye button (su-eye) left of the action buttons (more, settings, collapse)
// of an expanded block scrolls the preview iframe to the corresponding block. The button
// is only shown for blocks the preview reported as visible (rendered and not hidden).

const SCROLL_TITLES = {de: 'Im Preview anzeigen', en: 'Show in preview', it: 'Mostra nell\'anteprima'};
const SCROLL_TITLE = SCROLL_TITLES[(document.documentElement.lang || navigator.language || '').slice(0, 2)] || SCROLL_TITLES.de;
const ICON_BUTTONS_SELECTOR = ':scope > [class*="content--"] > header > [class*="icon-buttons--"]';

let previewWindow = null;
let visibleBlockIds = new Set();

function isPreviewAlive() {
    if (!previewWindow || previewWindow.closed) return false;
    const frames = document.querySelectorAll('iframe');
    for (let i = 0; i < frames.length; i++) {
        if (frames[i].contentWindow === previewWindow) return true;
    }
    return false;
}

function createScrollButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sulu-pbf-scroll';
    button.title = SCROLL_TITLE;
    button.innerHTML = '<span class="su-eye" aria-hidden="true" style="font-size:1.25em;vertical-align:-0.1em"></span>';
    button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!isPreviewAlive()) return;
        previewWindow.postMessage({type: 'sulu-preview-block-scroll', id: button.dataset.blockId}, window.location.origin);
    });
    // Prevent the section's mousedown handlers (sortable) from firing.
    button.addEventListener('mousedown', function(e) { e.stopPropagation(); });
    return button;
}

let updateScheduled = false;

function updateScrollButtons() {
    updateScheduled = false;
    const alive = isPreviewAlive();
    const sections = document.querySelectorAll('[class*="sortableBlockList"] section[role="switch"]');

    sections.forEach(function(section) {
        // Only expanded blocks render the action buttons container.
        const iconButtons = section.querySelector(ICON_BUTTONS_SELECTOR);
        if (!iconButtons) return;

        let button = iconButtons.querySelector(':scope > .sulu-pbf-scroll');
        const id = getBlockUuidFromSection(section);

        if (!alive || !id || !visibleBlockIds.has(id)) {
            if (button) button.remove();
            return;
        }

        if (!button) button = createScrollButton();
        button.dataset.blockId = id;
        if (iconButtons.firstChild !== button) iconButtons.insertBefore(button, iconButtons.firstChild);
    });
}

function scheduleUpdate() {
    if (updateScheduled) return;
    updateScheduled = true;
    requestAnimationFrame(updateScrollButtons);
}

const buttonObserver = new MutationObserver(function(mutations) {
    for (let i = 0; i < mutations.length; i++) {
        const target = mutations[i].target;
        // Ignore mutations caused by our own buttons.
        if (target instanceof Element && target.classList.contains('sulu-pbf-scroll')) continue;
        scheduleUpdate();
        return;
    }
});

if (document.body) buttonObserver.observe(document.body, {childList: true, subtree: true});
else document.addEventListener('DOMContentLoaded', function() {
    buttonObserver.observe(document.body, {childList: true, subtree: true});
});

window.addEventListener('message', function(event) {
    const data = event.data;
    if (!data || data.type !== 'sulu-preview-visible-blocks' || !Array.isArray(data.ids)) return;
    if (!isFromPreviewFrame(event)) return;
    previewWindow = event.source;
    visibleBlockIds = new Set(data.ids.filter(function(id) { return typeof id === 'string' && id; }));
    scheduleUpdate();
});
