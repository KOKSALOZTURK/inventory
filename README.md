# Inventory Tracker & QR Equipment Management

A modern, mobile/tablet-friendly web app for tracking IT equipment using QR codes.

## Features
- Add equipment with name, ID, user, and assignment date
- Generate unique QR codes for each item
- Print and attach QR codes to equipment
- Scan QR codes to check in/out or update assignment
- Works on mobile and tablet browsers

## How to Use
1. Open `src/index.html` in your browser (mobile or tablet supported)
2. Use the navigation bar to:
   - View the homepage
   - Read the usage guide
   - Manage your inventory
3. Add equipment and generate QR codes (feature coming next)
4. Print and attach QR codes to your equipment
5. Scan QR codes to update inventory status

---

**Note:**
- No server or backend required for basic usage
- All data is stored in browser local storage
- For QR code generation and scanning, internet access may be required for external libraries

---

## Next Steps
- Implement inventory form and list
- Integrate QR code generation (using [qrcodejs](https://davidshimjs.github.io/qrcodejs/))
- Integrate QR code scanning (using [html5-qrcode](https://github.com/mebjas/html5-qrcode))

---

© 2025 Inventory Tracker. All rights reserved.
