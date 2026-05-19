import { createCrudModule } from './shared/crud-module.js';
import { apiUrl } from './shared/api-config.js';

const crud = createCrudModule({
    itemName: 'Paquetes',
    primaryKey: 'IDPaquete',
    baseUrl: apiUrl('paquetes'),
    elements: {
        form: null,
        formTitle: null,
        submitButton: null,
        mensaje: null,
        contenedor: null,
        buscador: null,
        btnCancelarEdicion: null,
        btnNuevo: null,
        paqueteModal: null,
        filtroEstado: null,
        btnLimpiarFiltros: null,
        metricTotal: null,
        metricDisponibles: null,
        metricAgotados: null
    },
    formCreateTitle: 'Nuevo Paquete',
    formEditTitle: (item) => `Editando paquete #${item.id || item.IDPaquete}`,
    submitCreateText: 'Guardar paquete',
    submitEditText: 'Actualizar paquete',
    
    getPayload: (form) => {
        const formData = new FormData(form);
        return {
            NombrePaquete: String(formData.get('nombre') || '').trim(),
            Descripcion: String(formData.get('descripcion') || '').trim(),
            Precio: Number(formData.get('precio')),
            Estado: parseInt(formData.get('estado'))
        };
    },
    fillForm: (item) => {
        document.getElementById('paqueteId').value = item.id || item.IDPaquete;
        document.getElementById('nombre').value = item.nombre || item.NombrePaquete || '';
        document.getElementById('descripcion').value = item.descripcion || item.Descripcion || '';
        document.getElementById('precio').value = item.precio || item.Precio || '';
        document.getElementById('estado').value = item.estado !== undefined ? item.estado : (item.Estado !== undefined ? item.Estado : 1);
    },
    onResetForm: () => {
        document.getElementById('paqueteId').value = '';
        document.getElementById('estado').value = '1';
    },
    renderResumen: (items, elements) => {
        if (elements.metricTotal) elements.metricTotal.textContent = items.length;
        if (elements.metricDisponibles) elements.metricDisponibles.textContent = items.filter((item) => (item.estado == 1 || item.Estado == 1)).length;
        if (elements.metricAgotados) elements.metricAgotados.textContent = items.filter((item) => (item.estado == 0 || item.Estado == 0)).length;
    },
    renderCard: (item, { escapeHtml, formatMoney }) => {
        const itemId = item.id || item.IDPaquete || item.ID || 'N/A';
        const itemNameRaw = item.nombre || item.NombrePaquete || item.Nombre || 'Paquete';
        const itemPrice = item.precio || item.Precio || 0;
        const itemDesc = item.descripcion || item.Descripcion || 'Paquete especial con servicios seleccionados.';
        const itemEstado = item.estado !== undefined ? item.estado : (item.Estado !== undefined ? item.Estado : 1);

        const statusText = itemEstado == 1 ? 'Disponible' : 'Agotado';
        const statusColor = itemEstado == 1 ? 'var(--ok)' : '#ef4444';

        return `
        <article class="package-card modern-card" style="display: flex; flex-direction: column; padding: 25px; border-radius: 20px; background: white; border: 1px solid rgba(0,0,0,0.06); transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.05); position: relative; min-height: 250px; justify-content: space-between;">
            <div style="position: absolute; top: 20px; right: 20px;">
                <span style="padding: 6px 14px; border-radius: 999px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; background: ${statusColor}; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    ${statusText}
                </span>
            </div>
            <div>
                <h4 style="margin: 0 0 10px 0; font-size: 1.4rem; color: var(--brand-deep); font-weight: 700; max-width: 80%;">${escapeHtml(itemNameRaw)}</h4>
                <p style="margin: 0 0 20px 0; font-size: 0.9rem; color: var(--muted); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                    ${escapeHtml(itemDesc)}
                </p>
            </div>
            <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 15px; border-top: 1px solid rgba(0,0,0,0.05); margin-bottom: 15px;">
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 0.75rem; color: var(--muted); font-weight: 600; text-transform: uppercase;">Precio Paquete</span>
                        <span style="font-weight: 800; color: var(--brand); font-size: 1.5rem;">${formatMoney(itemPrice)}</span>
                    </div>
                    <span style="font-size: 0.7rem; color: var(--muted);">ID: #${itemId}</span>
                </div>
                <div class="card-actions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button class="button secondary" style="min-height: 40px; border-radius: 10px; background: #f8fafc;" type="button" data-action="editar" data-id="${itemId}">✏️ Editar</button>
                    <button class="button danger" style="min-height: 40px; border-radius: 10px; background: #fef2f2; color: #ef4444; border: none;" type="button" data-action="eliminar" data-id="${itemId}">🗑️ Eliminar</button>
                </div>
            </div>
        </article>
        `;
    }
});

function openModal() {
    const modal = crud.elements.paqueteModal;
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = crud.elements.paqueteModal;
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

export function renderPaquetes(container) {
    crud.elements = {
        form: container.querySelector('#paqueteForm'),
        formTitle: container.querySelector('#formTitle'),
        submitButton: container.querySelector('#submitButton'),
        mensaje: container.querySelector('#mensaje'),
        contenedor: container.querySelector('#contenedor'),
        buscador: container.querySelector('#buscador'),
        btnCancelarEdicion: container.querySelector('#btnCancelarEdicion'),
        btnNuevo: container.querySelector('#btnNuevoPaquete'),
        paqueteModal: container.querySelector('#paqueteModal'),
        filtroEstado: container.querySelector('#filtroEstado'),
        btnLimpiarFiltros: container.querySelector('#btnLimpiarFiltros'),
        metricTotal: container.querySelector('#metricTotal'),
        metricDisponibles: container.querySelector('#metricDisponibles'),
        metricAgotados: container.querySelector('#metricAgotados')
    };

    // Eventos específicos
    if (crud.elements.btnNuevo) {
        crud.elements.btnNuevo.onclick = () => {
            crud.onResetForm();
            if (crud.elements.form) crud.elements.form.reset();
            crud.elements.formTitle.textContent = crud.formCreateTitle;
            crud.elements.submitButton.textContent = crud.submitCreateText;
            openModal();
        };
    }

    if (crud.elements.btnCancelarEdicion) {
        crud.elements.btnCancelarEdicion.onclick = closeModal;
    }

    if (crud.elements.filtroEstado) {
        crud.elements.filtroEstado.onchange = () => {
            crud.onRender(crud.state.items);
        };
    }

    if (crud.elements.btnLimpiarFiltros) {
        crud.elements.btnLimpiarFiltros.onclick = () => {
            if (crud.elements.buscador) crud.elements.buscador.value = '';
            if (crud.elements.filtroEstado) crud.elements.filtroEstado.value = 'todos';
            crud.onRender(crud.state.items);
        };
    }
    
    crud.onRender = (items) => {
        let filtrados = items;
        const query = crud.elements.buscador?.value.toLowerCase();
        const estado = crud.elements.filtroEstado?.value;

        if (query) {
            filtrados = filtrados.filter(it => crud.searchText(it).toLowerCase().includes(query));
        }

        if (estado && estado !== 'todos') {
            filtrados = filtrados.filter(it => String(it.estado || it.Estado) === estado);
        }

        const cont = crud.elements.contenedor;
        if (!cont) return;

        if (!filtrados.length) {
            cont.innerHTML = `<div class="empty" style="grid-column: 1/-1; padding: 50px; text-align: center; background: white; border-radius: 20px; color: var(--muted);">No hay paquetes para mostrar con estos filtros.</div>`;
            return;
        }

        cont.innerHTML = filtrados.map(item => crud.renderCard(item, {
            escapeHtml: (str) => String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])),
            formatMoney: (num) => `$${Number(num).toLocaleString()}`
        })).join('');

        crud.renderResumen(items, crud.elements);
    };

    const originalEdit = crud.edit;
    crud.edit = async (id) => {
        const item = crud.findById(id);
        if (item) {
            crud.fillForm(item);
            crud.state.editandoId = id;
            crud.elements.formTitle.textContent = typeof crud.formEditTitle === 'function' ? crud.formEditTitle(item) : crud.formEditTitle;
            crud.elements.submitButton.textContent = crud.submitEditText;
            openModal();
        }
    };

    if (crud.elements.form) {
        crud.elements.form.onsubmit = async (e) => {
            e.preventDefault();
            const payload = crud.getPayload(crud.elements.form);
            try {
                if (crud.state.editandoId) {
                    await crud.update(crud.state.editandoId, payload);
                } else {
                    await crud.create(payload);
                }
                setTimeout(closeModal, 1000);
            } catch (err) {
                console.error(err);
            }
        };
    }

    crud.init();
}

document.addEventListener('DOMContentLoaded', crud.init);