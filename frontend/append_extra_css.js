const fs = require('fs');

const cssToAppend = `
/* Selection States */
.room-card, .package-checkbox label {
    border: 2px solid transparent !important;
    transition: all 0.3s ease !important;
}

.room-card.selected, .package-checkbox input:checked + label {
    border-color: var(--brand) !important;
    background: rgba(61, 124, 98, 0.05) !important;
    box-shadow: 0 8px 24px rgba(61, 124, 98, 0.15) !important;
}

.room-card.selected h4, .package-checkbox input:checked + label h4 {
    color: var(--brand-deep);
}

/* Service item styling */
.service-item-row {
    display: flex;
    align-items: center;
    padding: 15px;
    background: white;
    border: 1px solid rgba(0,0,0,0.05);
    border-radius: 12px;
    gap: 15px;
}

.service-icon-box {
    width: 40px;
    height: 40px;
    background: var(--paper);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
}

.service-item-info {
    flex: 1;
}

.service-item-info h5 {
    margin: 0;
    font-size: 1rem;
}

.service-item-info p {
    margin: 0;
    font-size: 0.8rem;
    color: var(--muted);
}

.service-item-actions {
    display: flex;
    align-items: center;
    gap: 15px;
}

.quantity-selector {
    display: flex;
    align-items: center;
    background: var(--paper);
    border-radius: 8px;
    padding: 2px;
}

.qty-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 4px;
    font-weight: bold;
}

.qty-btn:hover {
    background: white;
}

.qty-val {
    width: 30px;
    text-align: center;
    font-size: 0.9rem;
    font-weight: 600;
}

.service-check-input {
    width: 20px !important;
    height: 20px !important;
    cursor: pointer;
}
`;

fs.appendFileSync('c:/Users/yoniu/OneDrive/Escritorio/Proyecto_Hospedaje_vialuna/frontend/css/admin-theme.css', cssToAppend);
console.log('Extra CSS appended.');
