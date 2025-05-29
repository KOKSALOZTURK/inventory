// --- Inventory Tracker App.js (Final Fix: Prevent reload, robust navigation, always localStorage) ---

document.addEventListener('DOMContentLoaded', () => {
    // Force inventory section on load for troubleshooting
    window.location.hash = '#inventory';
    // Navigation logic (robust: prevent reload, always inject inventory UI on nav)
    document.querySelector('nav').addEventListener('click', function(e) {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const target = e.target.getAttribute('href').replace('#', '');
            window.location.hash = '#' + target;
            // The hashchange event will handle the rest
        }
    });
    // On load, handle the current hash
    handleHashChange();
});

window.addEventListener('hashchange', handleHashChange);

function handleHashChange() {
    const hash = window.location.hash.replace('#', '') || 'home';
    document.querySelectorAll('main section').forEach(sec => {
        sec.classList.toggle('active-section', sec.id === hash);
    });
    if (hash === 'inventory') {
        injectInventoryUI();
    }
}

function injectInventoryUI() {
    // Only inject if not already present
    if (document.getElementById('add-equipment-form')) {
        // UI already present, just re-bind handlers and render
        setupInventoryFeatures();
        return;
    }
    fetch('inventory-ui.html')
        .then(res => res.text())
        .then(html => {
            document.getElementById('inventory-app').innerHTML = html;
            waitForLibs(setupInventoryFeatures);
        });
}

function waitForLibs(cb) {
    // Only require QRCode for inventory logic
    const check = setInterval(() => {
        if (typeof QRCode !== 'undefined') {
            clearInterval(check);
            cb();
        }
    }, 50);
}

function setupInventoryFeatures() {
    console.log('setupInventoryFeatures triggered');
    console.log('setupInventoryFeatures: QRCode:', typeof QRCode, 'Html5Qrcode:', typeof Html5Qrcode);
    // --- LocalStorage helpers replaced with API helpers for Railway backend ---
    const getInventory = async () => {
        try {
            const res = await fetch('/api/inventory');
            return await res.json();
        } catch {
            return [];
        }
    };
    const setInventory = async (data) => {
        try {
            await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch {}
    };

    // --- Render Inventory List ---
    async function renderList() {
        const list = document.getElementById('equipment-list');
        if (!list) return;
        const items = await getInventory();
        list.innerHTML = '';
        if (!items.length) {
            const li = document.createElement('li');
            li.textContent = 'No equipment in inventory.';
            li.style.color = '#888';
            list.appendChild(li);
            return;
        }
        items.forEach((item, idx) => {
            const li = document.createElement('li');
            li.innerHTML = `<b>${item.name}</b> (ID: ${item.id})<br>User: ${item.user} | Date: ${item.date}
                <button class="show-qr" data-idx="${idx}">QR</button>
                <button class="remove-eq" data-idx="${idx}">Remove</button>`;
            list.appendChild(li);
        });
    }

    // --- Add Equipment Handler ---
    const form = document.getElementById('add-equipment-form');
    if (form._handlerAttached) return; // Prevent double binding
    form._handlerAttached = true;
    form.addEventListener('submit', async function(e) {
        e.preventDefault(); // CRITICAL: prevent reload
        console.log('Form submitted'); // TROUBLESHOOTING
        const name = document.getElementById('equip-name').value.trim();
        const id = document.getElementById('equip-id').value.trim();
        const user = document.getElementById('user-name').value.trim();
        const date = document.getElementById('assign-date').value;
        console.log('Form values:', { name, id, user, date });
        if (!name || !id || !user || !date) return;
        let items = await getInventory();
        items.push({ name, id, user, date });
        try {
            await setInventory(items);
            // Always re-fetch from backend to ensure sync
            items = await getInventory();
            renderList();
            // Find the last item (just added) and show QR
            const lastItem = items[items.length - 1];
            if (lastItem) showQRModal(lastItem);
        } catch (err) {
            console.error('Error adding equipment:', err);
            alert('Failed to add equipment. Please try again.');
        }
        this.reset();
    });

    // --- Remove/Show QR Handler ---
    document.getElementById('equipment-list').onclick = async function(e) {
        if (e.target.classList.contains('remove-eq')) {
            const idx = +e.target.dataset.idx;
            const items = await getInventory();
            items.splice(idx, 1);
            await setInventory(items);
            renderList();
        } else if (e.target.classList.contains('show-qr')) {
            const idx = +e.target.dataset.idx;
            const items = await getInventory();
            showQRModal(items[idx]);
        }
    };

    // --- Export/Import Buttons ---
    const section = document.getElementById('equipment-list-section');
    if (section && !document.getElementById('export-inventory-btn')) {
        const exportBtn = document.createElement('button');
        exportBtn.type = 'button';
        exportBtn.id = 'export-inventory-btn';
        exportBtn.textContent = 'Export Inventory';
        exportBtn.style.marginRight = '0.5rem';
        section.insertBefore(exportBtn, section.firstChild);
        exportBtn.onclick = async function() {
            const items = await getInventory();
            const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'inventory.json';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        };
    }
    if (section && !document.getElementById('import-inventory-btn')) {
        const importBtn = document.createElement('button');
        importBtn.type = 'button';
        importBtn.id = 'import-inventory-btn';
        importBtn.textContent = 'Import Inventory';
        section.insertBefore(importBtn, section.firstChild);
        importBtn.onclick = function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.onchange = async function(e) {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async function(evt) {
                    try {
                        const data = JSON.parse(evt.target.result);
                        if (Array.isArray(data)) {
                            await setInventory(data);
                            renderList();
                            alert('Inventory imported successfully!');
                        } else {
                            alert('Invalid inventory file.');
                        }
                    } catch {
                        alert('Failed to read inventory file.');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        };
    }

    // --- QR Modal Logic ---
    function showQRModal(item) {
        const modal = document.getElementById('qr-modal');
        const qrDiv = document.getElementById('qr-code-display');
        qrDiv.innerHTML = '';
        if (qrDiv._qrInstance) {
            qrDiv._qrInstance.clear();
            qrDiv._qrInstance = null;
        }
        while (qrDiv.firstChild) qrDiv.removeChild(qrDiv.firstChild);
        const qr = new QRCode(qrDiv, {
            text: JSON.stringify(item),
            width: 200,
            height: 200
        });
        qrDiv._qrInstance = qr;
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        document.getElementById('print-qr').onclick = function() {
            const img = qrDiv.querySelector('img') || qrDiv.querySelector('canvas');
            const imgSrc = img && img.src ? img.src : '';
            const win = window.open('', '', 'width=300,height=350');
            win.document.write(`<img src='${imgSrc}'/><br><pre>${item.name}\nID: ${item.id}</pre>`);
            win.print();
        };
    }
    document.getElementById('close-qr-modal').onclick = function() {
        document.getElementById('qr-modal').style.display = 'none';
    };

    // --- QR Scan Logic ---
    if (window.Html5Qrcode) {
        document.getElementById('scan-section').style.display = 'block';
        const qrReader = new Html5Qrcode('qr-reader');
        qrReader.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 200 },
            qrCodeMessage => {
                document.getElementById('scan-result').innerText = 'Scanned: ' + qrCodeMessage;
                try {
                    const data = JSON.parse(qrCodeMessage);
                    alert(`Equipment: ${data.name}\nID: ${data.id}\nUser: ${data.user}\nDate: ${data.date}`);
                } catch {}
            },
            error => {}
        );
    } else {
        document.getElementById('scan-section').style.display = 'none';
    }

    // --- Serial Scan Button Logic ---
    const scanBtn = document.getElementById('scan-serial-btn');
    const serialModal = document.getElementById('serial-scan-modal');
    const closeSerialModal = document.getElementById('close-serial-modal');
    let serialQrReader = null;
    if (scanBtn && serialModal && closeSerialModal && window.Html5Qrcode) {
        scanBtn.onclick = function() {
            serialModal.style.display = 'flex';
            serialModal.style.alignItems = 'center';
            serialModal.style.justifyContent = 'center';
            document.getElementById('serial-scan-result').innerText = '';
            if (!serialQrReader) {
                serialQrReader = new Html5Qrcode('serial-qr-reader');
            }
            serialQrReader.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: 200 },
                code => {
                    document.getElementById('serial-scan-result').innerText = 'Serial: ' + code;
                    document.getElementById('equip-id').value = code;
                    setTimeout(() => {
                        serialQrReader.stop().then(() => {
                            serialModal.style.display = 'none';
                        });
                    }, 1200);
                },
                error => {
                    console.error("QR SCAN ERROR:", error);
                }
            ).catch(err => {
                console.error("Camera start failed:", err);
                alert("Failed to start camera. Please check camera permissions or try another device.");
            });
        };
        closeSerialModal.onclick = function() {
            serialModal.style.display = 'none';
            if (serialQrReader) {
                serialQrReader.stop().catch(()=>{});
            }
        };
    }

    // --- Equipment QR Scan Button Logic ---
    const openEquipQrScanBtn = document.getElementById('open-equip-qr-scan');
    const equipQrScanModal = document.getElementById('equip-qr-scan-modal');
    const closeEquipQrScanModal = document.getElementById('close-equip-qr-scan-modal');
    let equipQrReader = null;
    if (openEquipQrScanBtn && equipQrScanModal && closeEquipQrScanModal && window.Html5Qrcode) {
        openEquipQrScanBtn.onclick = function() {
            equipQrScanModal.style.display = 'flex';
            equipQrScanModal.style.alignItems = 'center';
            equipQrScanModal.style.justifyContent = 'center';
            document.getElementById('equip-qr-scan-result').innerText = '';
            if (!equipQrReader) {
                equipQrReader = new Html5Qrcode('equip-qr-reader');
            }
            equipQrReader.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: 200 },
                code => {
                    document.getElementById('equip-qr-scan-result').innerText = 'Scanned: ' + code;
                    try {
                        const data = JSON.parse(code);
                        document.getElementById('equip-qr-scan-result').innerHTML = `<b>Name:</b> ${data.name}<br><b>ID:</b> ${data.id}<br><b>User:</b> ${data.user}<br><b>Date:</b> ${data.date}`;
                    } catch {
                        document.getElementById('equip-qr-scan-result').innerText = 'Invalid QR code.';
                    }
                    setTimeout(() => {
                        equipQrReader.stop().then(() => {
                            // Optionally auto-close modal
                        });
                    }, 2000);
                },
                error => {
                    console.error("EQUIP QR SCAN ERROR:", error);
                }
            ).catch(err => {
                console.error("Camera start failed (equip QR):", err);
                alert("Failed to start camera. Please check camera permissions or try another device.");
            });
        };
        closeEquipQrScanModal.onclick = function() {
            equipQrScanModal.style.display = 'none';
            if (equipQrReader) {
                equipQrReader.stop().catch(()=>{});
            }
        };
    }

    // --- Initial Render ---
    renderList();
}
// --- End of Final App.js ---
