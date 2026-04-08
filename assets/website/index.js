if (window.parent !== window) {

    const html = document.documentElement;
    const activeSegment = html.dataset.suluSegment || '';
    const activeWebspace = html.dataset.suluWebspace || '';
    const targetOrigin = window.location.origin || '*';

    const icon = document.createElement('button');
    const titles = { de: 'Block fokussieren', en: 'Focus block', it: 'Focalizza blocco' };
    icon.title = titles[html.lang] || titles.en;
    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M288-16c8.8 0 16 7.2 16 16l0 32.6C415 40.4 503.6 129 511.4 240l32.6 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-32.6 0C503.6 383 415 471.6 304 479.4l0 32.6c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-32.6C161 471.6 72.4 383 64.6 272L32 272c-8.8 0-16-7.2-16-16s7.2-16 16-16l32.6 0C72.4 129 161 40.4 272 32.6L272 0c0-8.8 7.2-16 16-16zM96.7 272c7.7 93.3 82.1 167.6 175.3 175.3l0-47.3c0-8.8 7.2-16 16-16s16 7.2 16 16l0 47.3c93.3-7.7 167.6-82.1 175.3-175.3L432 272c-8.8 0-16-7.2-16-16s7.2-16 16-16l47.3 0C471.6 146.7 397.3 72.4 304 64.7l0 47.3c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-47.3C178.7 72.4 104.4 146.7 96.7 240l47.3 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-47.3 0zM288 232a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/></svg>';

    Object.assign(icon.style, {
        position: 'absolute',
        zIndex: '10001',
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
        zIndex: '10000',
        cursor: 'pointer',
    });

    const style = document.createElement('style');
    style.textContent = '[data-block-id].sulu-block-active{position:relative}';
    document.head.appendChild(style);

    let activeBlock = null;

    function triggerClick() {
        if (!activeBlock) return;
        window.parent.postMessage({
            type: 'sulu-preview-block-click',
            id: activeBlock.dataset.blockId,
            segment: activeSegment,
            webspace: activeWebspace,
        }, targetOrigin);
    }

    function showIcon(block) {
        if (activeBlock === block) return;
        if (activeBlock) activeBlock.classList.remove('sulu-block-active');
        activeBlock = block;
        block.classList.add('sulu-block-active');
        block.appendChild(stripe);

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

    function getOutermostBlock(el) {
        let block = null;
        let node = el instanceof Element ? el : null;
        while (node && node !== document.body) {
            if (node.hasAttribute('data-block-id')) block = node;
            node = node.parentElement;
        }
        return block;
    }

    document.addEventListener('mouseenter', function(e) {
        if (e.target === stripe || e.target === icon) return;
        const block = getOutermostBlock(e.target);
        if (block) showIcon(block);
    }, true);

    document.addEventListener('mouseleave', function(e) {
        if (e.relatedTarget === icon || e.relatedTarget === stripe) return;
        const block = getOutermostBlock(e.target);
        if (block && block === activeBlock) {
            const toBlock = getOutermostBlock(e.relatedTarget);
            if (toBlock !== block) hideIcon();
        }
    }, true);

    icon.addEventListener('mouseleave', function(e) {
        const toBlock = e.relatedTarget instanceof Element && e.relatedTarget.closest('[data-block-id]');
        if (!toBlock && e.relatedTarget !== stripe) hideIcon();
    });

    stripe.addEventListener('mouseleave', function(e) {
        const toBlock = e.relatedTarget instanceof Element && e.relatedTarget.closest('[data-block-id]');
        if (!toBlock && e.relatedTarget !== icon) hideIcon();
    });

    icon.addEventListener('click', triggerClick);
    stripe.addEventListener('click', triggerClick);
}
