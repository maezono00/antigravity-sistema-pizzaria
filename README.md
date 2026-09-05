# 🍕 Integrated POS, Order Management, and Delivery System (PDV)

An integrated, local-first **Point of Sale (POS)** and **Kitchen Display System (KDS)** designed for restaurants and pizzerias. Developed as the **final graduation project** for the **SENAI FIC "Desenvolvimento IA Google Antigravity"** course.

This application is optimized for touch-screen responsiveness, keyboard-driven high-speed operations, and local-first execution.

---

## ⚡ Quick Start (1-Command Run)

There is no need to configure complex database servers, compile heavy node packages, or install external frameworks. The system runs on native **Python 3** and an embedded **SQLite3** database.

### How to Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/maezono00/antigravity-sistema-pizzaria.git
   cd antigravity-sistema-pizzaria
   ```

2. **Execute the run command:**
   * **Using Python directly:**
     ```bash
     python3 run.py
     ```
   * **Or using the provided bash script:**
     ```bash
     ./iniciar.sh
     ```

3. **Open your browser:**
   Go to 👉 **[http://localhost:8000](http://localhost:8000)** (or `http://localhost:8001` if port 8000 is occupied).

---

## 🎯 Implemented Features

### 1. Customer Management (RF-01)
* **Quick Lookup:** Instantly search for customers by name, phone, or CPF using the **F7** shortcut within the order interface.
* **Seamless Registration:** Easily register new customers with full addresses, neighborhood mapping, and field validation.
* **Order Association:** Automatically link customers' history and addresses to their respective orders.

### 2. Order Entry & Kitchen Monitor (RF-02)
* **Stitch-Inspired UI:** Responsive interface tailored for touch-screens and swift counter operations.
* **Dynamic Menu Navigation:** Categorized catalog (*Pizzas, Burgers, Sides, Drinks, Desserts*) with real-time quantity controls.
* **KDS (Kitchen Display System):** Live kitchen screen tracking order prep progress (*Pending ➔ Preparing ➔ Ready ➔ Dispatched*).
* **Keyboard Shortcuts:**
  * `F2` — Finish & Liquidate Sale
  * `F4` — Clear Active Order / Cart
  * `F7` — Identify Customer
  * `F9` — Simulate Incoming iFood Order
  * `ESC` — Close Modals

### 3. Payment Processing & Checkout (RF-03)
* **Multiple Methods:** Complete checkout flows for Cash, PIX, Credit, and Debit cards.
* **Change Calculator:** Automatically computes exact change for cash transactions.
* **PIX QR Generator:** Simulates real-time PIX key and QR Code generation.
* **Receipt Preview:** Immediate printable checkout receipt view for physical order verification.

### 4. Delivery Fees & Routing (RF-04)
* **Automated Rates:** Dynamically calculates delivery charges based on distance (km) and the customer's neighborhood.
* **Fulfillment Filters:** Clean visual segregation between Dine-In/Counter orders and Delivery orders.
* **Courier Tracking:** Interactive status monitor tracking delivery driver routing.

### 5. Multi-Platform Delivery Simulator (RF-05)
* **Adapter Pattern Architecture:** Implements a unified adapter layout to handle external delivery integrations (iFood, Uber Eats, 99 Food).
* **Interactive Demo Buttons:** Dedicated on-screen simulators (**Simulate iFood**, **Simulate Uber**, **Simulate 99**) to test platform ingestions without requiring active merchant production credentials.
* **Real-time Notifications:** Instant alerts display immediately when external simulator orders are received.

### 6. Inventory & Auto-Deductions (RF-06)
* **Real-Time Deductions:** Automatic inventory deduction occurs the instant an order is finalized.
* **Safety Lockouts:** Blocks selling items that do not have enough remaining stock.
* **Low-Stock Warnings:** Visually tags low-stock ingredients or items with warnings in the catalog.

### 7. Cash Drawer & Shift Management (RF-07)
* **Opening Drawer Logs:** Records initial bank/petty cash reserves and the operating clerk at shift launch.
* **Adjustments:** Log cash additions (**Suprimento**) or quick cash drops (**Sangria**) with mandatory text justifications.
* **Blind Drawer Reconciliation:** Facilitates end-of-day blind counts, automatically highlighting drawer discrepancies (shortages/surpluses) alongside a detailed financial report per payment method.

---

## 📂 Project Structure

```text
antigravity-projeto-final/
├── app/
│   ├── static/
│   │   ├── css/style.css       # Custom UI layout styling
│   │   ├── js/app.js           # POS front-end logic, KDS, delivery integrations
│   │   └── index.html          # Main HTML structure with Tailwind CSS & Icons
│   ├── database.py             # SQLite data models, seeding, and connections
│   ├── services.py             # Business rules, delivery adapter & delivery fees
│   └── server.py               # Lightweight Python HTTP REST server
├── run.py                      # Master execution script
├── iniciar.sh                  # One-click bash script
├── requisitos.txt              # Original functional specifications document
├── aspectos_tecnicos_programacao.txt # Original technical programming guidelines
└── README.md                   # Project documentation
```

---

## 🛠️ Architecture & Tech Stack

* **Language & Backend:** Native Python 3, making deployment seamless and lightweight without heavy framework dependencies.
* **Database:** SQLite3 embedded relational database for local-first reliability.
* **Design & Styling:** Tailwind CSS combined with a **Stitch/Clarity** style dashboard layout for high accessibility.
* **Software Patterns:** Implements the **Adapter Design Pattern** to ingest and process heterogeneous external API orders seamlessly under a unified internal interface.
