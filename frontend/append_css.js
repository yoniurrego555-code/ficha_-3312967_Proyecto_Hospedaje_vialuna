const fs = require('fs');

const cssToAppend = `
/* =========================================
   TWO-COLUMN RESERVATION FORM LAYOUT
   ========================================= */
.reservation-header-top {
    margin-bottom: 2rem;
}

.basic-info-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    background: white;
    padding: 20px;
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    border: 1px solid rgba(0,0,0,0.05);
    margin-top: 15px;
}

.basic-info-bar .form-group {
    flex: 1;
    min-width: 150px;
    margin-bottom: 0;
}

.two-column-layout {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 30px;
    align-items: start;
    background: transparent;
    padding: 0;
    box-shadow: none;
    border: none;
}

@media (max-width: 992px) {
    .two-column-layout {
        grid-template-columns: 1fr;
    }
}

.reservation-sidebar {
    position: sticky;
    top: 24px;
}

.summary-card {
    background: white;
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 8px 24px rgba(38, 83, 64, 0.08);
    border: 1px solid rgba(38, 83, 64, 0.1);
}

.summary-card h3 {
    margin-top: 0;
    margin-bottom: 20px;
    font-size: 1.25rem;
    color: var(--brand-deep);
    display: flex;
    align-items: center;
    gap: 10px;
}

.summary-card h3::before {
    content: "📝";
    font-size: 1.1em;
}

.summary-content h4 {
    margin: 0 0 10px 0;
    color: var(--muted);
    font-size: 0.95rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.summary-divider {
    border: none;
    border-top: 1px dashed var(--line);
    margin: 15px 0;
}

.summary-divider-thick {
    border: none;
    border-top: 2px solid var(--line);
    margin: 15px 0;
}

.summary-item {
    display: flex;
    gap: 15px;
    align-items: center;
    margin-bottom: 15px;
}

.summary-item img {
    width: 60px;
    height: 45px;
    object-fit: cover;
    border-radius: 8px;
}

.summary-item-details h5 {
    margin: 0 0 4px 0;
    font-size: 1rem;
    color: var(--ink);
}

.summary-item-details p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--muted);
}

.summary-item-price {
    margin-left: auto;
    font-weight: 600;
    color: var(--brand-deep);
}

.total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    font-size: 1.05rem;
    color: var(--ink);
}

.summary-grand-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1.4rem;
    margin-bottom: 20px;
    color: var(--brand-deep);
}

.w-100 {
    width: 100%;
}

.mt-2 {
    margin-top: 10px;
}

.empty-state-small {
    color: var(--muted);
    font-style: italic;
    font-size: 0.9rem;
    margin: 5px 0;
}

/* Enhancements for left column grids */
.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 20px;
}

.list-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 15px;
}

.form-section {
    background: white;
    padding: 24px;
    border-radius: 20px;
    margin-bottom: 20px;
    border: 1px solid rgba(0,0,0,0.05);
}

.form-section h3 {
    margin-top: 0;
    margin-bottom: 20px;
    color: var(--brand-deep);
    font-size: 1.2rem;
}
`;

fs.appendFileSync('c:/Users/yoniu/OneDrive/Escritorio/Proyecto_Hospedaje_vialuna/frontend/css/admin-theme.css', cssToAppend);
console.log('CSS appended.');
