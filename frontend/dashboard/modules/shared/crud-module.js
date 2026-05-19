// Generic CRUD Module for frontend modules

export function createCrudModule(config) {
    const {
        baseUrl,
        itemName,
        itemTitle = itemName || 'CRUD',
        primaryKey = 'id',
        ...crudConfig
    } = config;

    const state = {
        items: [],
        loading: false,
        error: null
    };

    async function request(url, options = {}) {
        const token = localStorage.getItem('vialuna_token');
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                    ...(options.headers || {})
                },
                ...options
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || data.ok === false) {
                throw new Error(data.mensaje || data.error || `No se pudo completar la operación`);
            }

            return data;
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Error(`Error de conexión con el servidor`);
            }
            throw error;
        }
    }

    async function list() {
        state.loading = true;
        state.error = null;
        
        try {
            const data = await request(baseUrl);
            console.log(`📡 Data received for ${itemTitle}:`, data);
            state.items = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
            return state.items;
        } catch (error) {
            state.error = error.message;
            throw error;
        } finally {
            state.loading = false;
        }
    }

    async function create(payload) {
        state.loading = true;
        state.error = null;
        
        try {
            const data = await request(baseUrl, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            await list(); // Refresh list
            return data;
        } catch (error) {
            state.error = error.message;
            throw error;
        } finally {
            state.loading = false;
        }
    }

    async function update(id, payload) {
        state.loading = true;
        state.error = null;
        
        try {
            const data = await request(`${baseUrl}/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            
            await list(); // Refresh list
            return data;
        } catch (error) {
            state.error = error.message;
            throw error;
        } finally {
            state.loading = false;
        }
    }

    async function remove(id) {
        state.loading = true;
        state.error = null;
        
        try {
            const data = await request(`${baseUrl}/${id}`, {
                method: 'DELETE'
            });
            
            await list(); // Refresh list
            return data;
        } catch (error) {
            state.error = error.message;
            throw error;
        } finally {
            state.loading = false;
        }
    }

    async function secondaryAction(id, payload) {
        if (!crudConfig.secondaryAction) return;
        
        state.loading = true;
        state.error = null;
        
        try {
            const { path, method = 'PATCH' } = crudConfig.secondaryAction;
            const data = await request(`${baseUrl}/${id}/${path}`, {
                method,
                body: JSON.stringify(payload)
            });
            
            await list(); // Refresh list
            return data;
        } catch (error) {
            state.error = error.message;
            throw error;
        } finally {
            state.loading = false;
        }
    }

    function findById(id) {
        return state.items.find(item => String(item[primaryKey]) === String(id));
    }

    function getItems() {
        return state.items;
    }

    function isLoading() {
        return state.loading;
    }

    function getError() {
        return state.error;
    }

    function clearError() {
        state.error = null;
    }

    // Initialize the module
    function init() {
        const self = this || {};
        console.log(`📦 ${itemTitle} module initialized`);
        list().then(() => {
            if (self.onRender) self.onRender(state.items);
            else if (config.onRender) config.onRender(state.items);

            if (self.renderResumen && self.elements) {
                self.renderResumen(state.items, self.elements);
            } else if (crudConfig.renderResumen && config.elements) {
                crudConfig.renderResumen(state.items, config.elements);
            }
        }).catch(error => {
            console.error(`❌ Error loading ${itemTitle}:`, error);
        });
    }

    return {
        // State
        state,
        
        // CRUD operations
        list,
        create,
        update,
        remove,
        secondaryAction,
        
        // Utility functions
        findById,
        getItems,
        isLoading,
        getError,
        clearError,
        
        // Initialization
        init,
        
        // Configuration
        ...crudConfig
    };
}
