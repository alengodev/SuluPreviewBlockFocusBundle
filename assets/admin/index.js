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
    const fiberKey = getFiberKey(section);
    if (!fiberKey) return null;
    let fiber = section[fiberKey];
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

window.addEventListener('message', function(event) {
    if (!event.data || event.data.type !== 'sulu-preview-block-click') return;

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
