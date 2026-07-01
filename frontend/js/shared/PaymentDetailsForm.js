class PaymentDetailsForm {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.mode = options.mode || 'client'; // 'admin' or 'client'
        this.onChange = options.onChange || (() => {});
        this.data = {
            method: '',
            status: 'pending',
            amountPaid: 0,
            change: 0,
            cardType: '',
            last4: '',
            authorizationNumber: '',
            cardHolder: '',
            bank: '',
            reference: '',
            transferDate: null,
            notes: ''
            // proofUrl is handled separately via upload endpoint in client, but can be displayed in admin
        };
        this.reservationTotal = 0;
        this.currentMethodId = null; // 1: Efectivo, 2: Tarjeta, 3: Transferencia (asumiendo IDs clásicos)
    }

    // methodId: 1=Efectivo, 2=Tarjeta, 3=Transferencia
    render(methodId, total = 0, initialData = null) {
        this.currentMethodId = parseInt(methodId, 10);
        this.reservationTotal = parseFloat(total) || 0;
        
        if (initialData) {
            this.data = { ...this.data, ...initialData };
        } else {
            // Clean data if changing method without initialData
            this.data = {
                method: this._getMethodName(this.currentMethodId),
                status: 'pending',
                amountPaid: 0,
                change: 0,
                cardType: '',
                last4: '',
                authorizationNumber: '',
                cardHolder: '',
                bank: '',
                reference: '',
                transferDate: null,
                notes: ''
            };
        }

        if (!this.container) return;

        // Block editing if approved (unless admin explicitly wants to change, handled in admin module)
        const isApproved = this.data.status === 'approved';
        const disabledAttr = (isApproved && this.mode !== 'admin') ? 'disabled' : '';

        let html = '';
        if (this.currentMethodId !== 1 && this.currentMethodId !== 2) {
            html += `<div class="payment-details-card" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 16px; background-color: #f8fafc;">
                <h4 style="margin-top: 0; margin-bottom: 12px; font-weight: 600; color: #334155;">Detalles del Pago</h4>`;

            
            if (isApproved) {
                html += `<div style="background-color: #dcfce7; color: #166534; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; font-size: 14px;">Pago aprobado. No se puede editar.</div>`;
            }
        }

        if (this.currentMethodId === 2) {
            // Disabled
        } else if (this.currentMethodId === 3) {
            // TRANSFERENCIA
            // Removed form fields, only show existing proof if any
            html += `
                <div style="margin-bottom: 12px; color: #475569; font-size: 14px;">
                    Por favor, realiza la transferencia a la cuenta autorizada y sube el comprobante.
                </div>
            `;

            // Display existing proof or upload hint
            if (this.data.proofUrl) {
                html += `
                    <div class="form-group" style="margin-bottom: 12px;">
                        <label>Comprobante actual:</label>
                        <div>
                            <a href="${this.data.proofUrl}" target="_blank" style="color: #2563eb; text-decoration: underline;">Ver comprobante</a>
                        </div>
                    </div>
                `;
                if (this.mode === 'client') {
                     html += `<div style="color: #854d0e; background-color: #fef08a; padding: 8px; border-radius: 4px; font-size: 13px;">Tu pago está pendiente de verificación por administración.</div>`;
                }
            } else if (this.mode === 'client') {
                html += `<div style="color: #334155; font-size: 13px; margin-bottom: 12px;">Nota: Podrás subir el comprobante una vez creada la reserva en el paso final.</div>`;
            }
        }

        if (this.currentMethodId !== 1 && this.currentMethodId !== 2) {
            html += `</div>`;
        }
        this.container.innerHTML = html;
        this._attachEvents();
    }

    _getMethodName(id) {
        switch(id) {
            case 1: return 'Efectivo';
            case 2: return 'Tarjeta Débito/Crédito';
            case 3: return 'Transferencia Bancaria';
            default: return 'Desconocido';
        }
    }

    _attachEvents() {
        // No events to attach for now
    }

    getData() {
        if (!this.currentMethodId) return null;

        const data = {
            method: this._getMethodName(this.currentMethodId),
            status: this.data.status || 'pending',
        };

        if (this.currentMethodId === 2) {
            // Disabled
        } else if (this.currentMethodId === 3) {
            data.proofUrl = this.data.proofUrl || null;
        }

        return data;
    }

    validate() {
        if (this.currentMethodId === 2) {
            const last4 = this.container.querySelector('#pay_last4')?.value || '';
            if (!/^\\d{4}$/.test(last4)) {
                return "Los últimos 4 dígitos de la tarjeta deben ser exactamente 4 números.";
            }
            if (!this.container.querySelector('#pay_authorizationNumber')?.value) {
                return "El número de autorización es obligatorio para pagos con tarjeta.";
            }
        }
        return null; // Valid
    }
}

export default PaymentDetailsForm;
