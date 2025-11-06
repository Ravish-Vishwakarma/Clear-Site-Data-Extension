const input = document.getElementById('siteInput');
const addBtn = document.getElementById('addBtn');
const addCurrentBtn = document.getElementById('addCurrentBtn');
const clearCurrentBtn = document.getElementById('clearCurrent');
const list = document.getElementById('siteList');

async function refreshList() {
    list.innerHTML = '';
    const { sites = [] } = await chrome.storage.local.get('sites');
    sites.forEach(site => {
        const li = document.createElement('li');
        li.textContent = site;
        const remove = document.createElement('span');
        remove.textContent = '✖';
        remove.className = 'remove';
        remove.onclick = async () => {
            const updated = sites.filter(s => s !== site);
            await chrome.storage.local.set({ sites: updated });
            refreshList();
        };
        li.appendChild(remove);
        list.appendChild(li);
    });
}

addBtn.onclick = async () => {
    const domain = input.value.trim().toLowerCase();
    if (!domain) return;
    const { sites = [] } = await chrome.storage.local.get('sites');
    if (!sites.includes(domain)) {
        sites.push(domain);
        await chrome.storage.local.set({ sites });
        input.value = '';
        refreshList();
    }
};

addCurrentBtn.onclick = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.url) return;
    const url = new URL(tabs[0].url);
    const domain = url.hostname.toLowerCase();
    const { sites = [] } = await chrome.storage.local.get('sites');
    if (!sites.includes(domain)) {
        sites.push(domain);
        await chrome.storage.local.set({ sites });
        refreshList();
    } else {
        showToast(`${domain} is already in your list.`);
    }
};

// Quick manual clear for current site
clearCurrentBtn.onclick = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.url) return;
    const url = new URL(tabs[0].url);
    const domain = url.hostname;

    showToast(`Clearing ${domain} data...`);

    try {
        // remove cookies
        const cookies = await chrome.cookies.getAll({ domain });
        await Promise.all(
            cookies.map(cookie => {
                const protocol = cookie.secure ? 'https:' : 'http:';
                const cookieDomain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
                const cookieUrl = `${protocol}//${cookieDomain}${cookie.path}`;
                const removeDetails = { url: cookieUrl, name: cookie.name };
                if (cookie.storeId) removeDetails.storeId = cookie.storeId;
                return chrome.cookies.remove(removeDetails);
            })
        );

        // clear site data
        await chrome.browsingData.remove({ origins: [url.origin] }, {
            cacheStorage: true,
            indexedDB: true,
            localStorage: true,
            serviceWorkers: true,
            webSQL: true
        });

        showToast(`Cleared all data for ${domain}.`);
    } catch (err) {
        console.error(err);
        showToast('Error clearing site data.');
    }
};

// Simple toast helper
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#111827',
        color: 'white',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        opacity: '0',
        transition: 'opacity 0.3s'
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => (toast.style.opacity = '1'));
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}

refreshList();
