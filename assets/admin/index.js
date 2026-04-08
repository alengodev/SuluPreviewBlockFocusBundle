// Preview block click-to-edit: clicking a block in the preview iframe scrolls to
// the corresponding block in the admin form and expands it.
//
// The preview iframe sends a message like { type: 'sulu-preview-block-click', id: 'text-2' }
// where the id is "<blockType>-<counter>" (1-based count of that block type on the page).
// We match by reading the block type from React Fiber and counting per type.

let cachedFiberKey = undefined;

function getFiberKey(el) {
    if (cachedFiberKey !== undefined) return cachedFiberKey;
    cachedFiberKey = Object.keys(el).find(function(k) {
        return k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance');
    }) || null;
    return cachedFiberKey;
}

function getBlockDataFromSection(section) {
    const fiberKey = getFiberKey(section);
    if (!fiberKey) return null;
    let fiber = section[fiberKey];
    let hops = 0;
    while (fiber && hops < 5) {
        const props = fiber.memoizedProps || fiber.pendingProps;
        if (props && props.value && typeof props.value.type === 'string' && props.value.type) {
            return props.value;
        }
        fiber = fiber.return;
        hops++;
    }
    return null;
}

function isBlockHidden(blockValue) {
    return !!(blockValue && blockValue.settings && blockValue.settings.hidden);
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

function scrollToTarget(target) {
    const scrollContainer = getScrollContainer(target);
    const containerRect = scrollContainer.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const scrollTop = scrollContainer.scrollTop + (targetRect.top - containerRect.top) - 10;
    scrollContainer.scrollTo({top: scrollTop, behavior: 'smooth'});
}

window.addEventListener('message', function(event) {
    if (!event.data || event.data.type !== 'sulu-preview-block-click') return;
    if (event.origin !== window.location.origin) return;

    // id format: "<blockType>-<1-based-counter>", e.g. "text-2"
    const id = event.data.id;
    if (!id || typeof id !== 'string') return;

    const activeSegment = event.data.segment || '';
    const activeWebspace = event.data.webspace || '';

    const dashIndex = id.lastIndexOf('-');
    if (dashIndex === -1) return;
    const blockType = id.slice(0, dashIndex);
    const targetCount = parseInt(id.slice(dashIndex + 1), 10);
    if (!blockType || isNaN(targetCount) || targetCount < 1) return;

    const allSections = document.querySelectorAll('[class*="sortableBlockList"] section[role="switch"]');
    let target = null;
    let targetIndex = -1;
    let typeCount = 0;

    for (let i = 0; i < allSections.length; i++) {
        const blockData = getBlockDataFromSection(allSections[i]);
        if (!blockData || blockData.type !== blockType) continue;
        if (isBlockHidden(blockData)) continue;
        if (activeSegment && activeWebspace
            && blockData.settings?.segment_enabled
            && blockData.settings?.segments?.[activeWebspace] !== activeSegment) continue;
        typeCount++;
        if (typeCount === targetCount) {
            target = allSections[i];
            targetIndex = i;
            break;
        }
    }

    if (!target) return;

    // 1. Collapse all other expanded blocks
    allSections.forEach(function(block, i) {
        if (i === targetIndex) return;
        const collapseBtn = block.querySelector('[aria-label="su-collapse-vertical"]');
        if (collapseBtn) collapseBtn.click();
    });

    // 2. Wait for collapse re-render, then expand target if not already open
    setTimeout(function() {
        const isExpanded = !!target.querySelector('[aria-label="su-collapse-vertical"]');
        if (isExpanded) {
            scrollToTarget(target);
        } else {
            target.click();
            // 3. Wait for expand re-render, then scroll to final position
            setTimeout(function() { scrollToTarget(target); }, 150);
        }
    }, 150);
});
