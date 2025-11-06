// background.js (service worker)

chrome.webNavigation.onCommitted.addListener(async details => {
    if (!details.url.startsWith('http')) return;

    const url = new URL(details.url);
    const domain = url.hostname;

    const { sites = [] } = await chrome.storage.local.get('sites');
    if (!sites.length) return;

    // check for exact or subdomain match
    const matched = sites.find(s => domain === s || domain.endsWith('.' + s));
    if (!matched) return;

    try {
        console.log('Auto-clearing site data for:', matched);

        // remove cookies
        const cookies = await chrome.cookies.getAll({ domain });
        const removals = cookies.map(cookie => {
            const protocol = cookie.secure ? 'https:' : 'http:';
            const cookieDomain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
            const cookieUrl = `${protocol}//${cookieDomain}${cookie.path}`;
            const removeDetails = { url: cookieUrl, name: cookie.name };
            if (cookie.storeId) removeDetails.storeId = cookie.storeId;
            return chrome.cookies.remove(removeDetails);
        });
        await Promise.all(removals);

        // clear site data
        await chrome.browsingData.remove({ origins: [url.origin] }, {
            cacheStorage: true,
            indexedDB: true,
            localStorage: true,
            serviceWorkers: true,
            webSQL: true
        });

        console.log('Data cleared for', matched);
    } catch (err) {
        console.error('Error clearing data for', domain, err);
    }
});
