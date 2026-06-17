/**
 * countries.js — Lista de países con código de marcación telefónica.
 * Exporta:
 *   buildCountryOptions(defaultCode) → string HTML de <option> elementos
 *   bindCountryDial(selectId, dialSpanId) → conecta el selector al prefijo telefónico
 *   findCountry(code) → devuelve objeto {code, name, dial} o undefined
 */

const COUNTRIES = [
  { code: 'AF', name: 'Afganistán', dial: '+93' },
  { code: 'AL', name: 'Albania', dial: '+355' },
  { code: 'DZ', name: 'Argelia', dial: '+213' },
  { code: 'AD', name: 'Andorra', dial: '+376' },
  { code: 'AO', name: 'Angola', dial: '+244' },
  { code: 'AG', name: 'Antigua y Barbuda', dial: '+1-268' },
  { code: 'AR', name: 'Argentina', dial: '+54' },
  { code: 'AM', name: 'Armenia', dial: '+374' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'AT', name: 'Austria', dial: '+43' },
  { code: 'AZ', name: 'Azerbaiyán', dial: '+994' },
  { code: 'BS', name: 'Bahamas', dial: '+1-242' },
  { code: 'BH', name: 'Bahréin', dial: '+973' },
  { code: 'BD', name: 'Bangladés', dial: '+880' },
  { code: 'BB', name: 'Barbados', dial: '+1-246' },
  { code: 'BY', name: 'Bielorrusia', dial: '+375' },
  { code: 'BE', name: 'Bélgica', dial: '+32' },
  { code: 'BZ', name: 'Belice', dial: '+501' },
  { code: 'BJ', name: 'Benín', dial: '+229' },
  { code: 'BT', name: 'Bután', dial: '+975' },
  { code: 'BO', name: 'Bolivia', dial: '+591' },
  { code: 'BA', name: 'Bosnia y Herzegovina', dial: '+387' },
  { code: 'BW', name: 'Botsuana', dial: '+267' },
  { code: 'BR', name: 'Brasil', dial: '+55' },
  { code: 'BN', name: 'Brunéi', dial: '+673' },
  { code: 'BG', name: 'Bulgaria', dial: '+359' },
  { code: 'BF', name: 'Burkina Faso', dial: '+226' },
  { code: 'BI', name: 'Burundi', dial: '+257' },
  { code: 'CV', name: 'Cabo Verde', dial: '+238' },
  { code: 'KH', name: 'Camboya', dial: '+855' },
  { code: 'CM', name: 'Camerún', dial: '+237' },
  { code: 'CA', name: 'Canadá', dial: '+1' },
  { code: 'CF', name: 'República Centroafricana', dial: '+236' },
  { code: 'TD', name: 'Chad', dial: '+235' },
  { code: 'CL', name: 'Chile', dial: '+56' },
  { code: 'CN', name: 'China', dial: '+86' },
  { code: 'CY', name: 'Chipre', dial: '+357' },
  { code: 'CO', name: 'Colombia', dial: '+57' },
  { code: 'KM', name: 'Comoras', dial: '+269' },
  { code: 'CG', name: 'Congo', dial: '+242' },
  { code: 'CR', name: 'Costa Rica', dial: '+506' },
  { code: 'HR', name: 'Croacia', dial: '+385' },
  { code: 'CU', name: 'Cuba', dial: '+53' },
  { code: 'CZ', name: 'República Checa', dial: '+420' },
  { code: 'DK', name: 'Dinamarca', dial: '+45' },
  { code: 'DJ', name: 'Yibuti', dial: '+253' },
  { code: 'DM', name: 'Dominica', dial: '+1-767' },
  { code: 'DO', name: 'República Dominicana', dial: '+1-809' },
  { code: 'EC', name: 'Ecuador', dial: '+593' },
  { code: 'EG', name: 'Egipto', dial: '+20' },
  { code: 'SV', name: 'El Salvador', dial: '+503' },
  { code: 'ES', name: 'España', dial: '+34' },
  { code: 'US', name: 'Estados Unidos', dial: '+1' },
  { code: 'ET', name: 'Etiopía', dial: '+251' },
  { code: 'FJ', name: 'Fiyi', dial: '+679' },
  { code: 'PH', name: 'Filipinas', dial: '+63' },
  { code: 'FI', name: 'Finlandia', dial: '+358' },
  { code: 'FR', name: 'Francia', dial: '+33' },
  { code: 'GA', name: 'Gabón', dial: '+241' },
  { code: 'GM', name: 'Gambia', dial: '+220' },
  { code: 'GE', name: 'Georgia', dial: '+995' },
  { code: 'GH', name: 'Ghana', dial: '+233' },
  { code: 'GR', name: 'Grecia', dial: '+30' },
  { code: 'GT', name: 'Guatemala', dial: '+502' },
  { code: 'GN', name: 'Guinea', dial: '+224' },
  { code: 'GW', name: 'Guinea-Bisáu', dial: '+245' },
  { code: 'GQ', name: 'Guinea Ecuatorial', dial: '+240' },
  { code: 'GY', name: 'Guyana', dial: '+592' },
  { code: 'HT', name: 'Haití', dial: '+509' },
  { code: 'HN', name: 'Honduras', dial: '+504' },
  { code: 'HU', name: 'Hungría', dial: '+36' },
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'ID', name: 'Indonesia', dial: '+62' },
  { code: 'IR', name: 'Irán', dial: '+98' },
  { code: 'IQ', name: 'Irak', dial: '+964' },
  { code: 'IE', name: 'Irlanda', dial: '+353' },
  { code: 'IL', name: 'Israel', dial: '+972' },
  { code: 'IT', name: 'Italia', dial: '+39' },
  { code: 'JM', name: 'Jamaica', dial: '+1-876' },
  { code: 'JP', name: 'Japón', dial: '+81' },
  { code: 'JO', name: 'Jordania', dial: '+962' },
  { code: 'KZ', name: 'Kazajistán', dial: '+7' },
  { code: 'KE', name: 'Kenia', dial: '+254' },
  { code: 'KW', name: 'Kuwait', dial: '+965' },
  { code: 'LA', name: 'Laos', dial: '+856' },
  { code: 'LB', name: 'Líbano', dial: '+961' },
  { code: 'LY', name: 'Libia', dial: '+218' },
  { code: 'LI', name: 'Liechtenstein', dial: '+423' },
  { code: 'LT', name: 'Lituania', dial: '+370' },
  { code: 'LU', name: 'Luxemburgo', dial: '+352' },
  { code: 'MG', name: 'Madagascar', dial: '+261' },
  { code: 'MY', name: 'Malasia', dial: '+60' },
  { code: 'MV', name: 'Maldivas', dial: '+960' },
  { code: 'ML', name: 'Malí', dial: '+223' },
  { code: 'MT', name: 'Malta', dial: '+356' },
  { code: 'MA', name: 'Marruecos', dial: '+212' },
  { code: 'MX', name: 'México', dial: '+52' },
  { code: 'MD', name: 'Moldavia', dial: '+373' },
  { code: 'MC', name: 'Mónaco', dial: '+377' },
  { code: 'MN', name: 'Mongolia', dial: '+976' },
  { code: 'ME', name: 'Montenegro', dial: '+382' },
  { code: 'MZ', name: 'Mozambique', dial: '+258' },
  { code: 'MM', name: 'Myanmar', dial: '+95' },
  { code: 'NA', name: 'Namibia', dial: '+264' },
  { code: 'NP', name: 'Nepal', dial: '+977' },
  { code: 'NI', name: 'Nicaragua', dial: '+505' },
  { code: 'NE', name: 'Níger', dial: '+227' },
  { code: 'NG', name: 'Nigeria', dial: '+234' },
  { code: 'NO', name: 'Noruega', dial: '+47' },
  { code: 'NZ', name: 'Nueva Zelanda', dial: '+64' },
  { code: 'OM', name: 'Omán', dial: '+968' },
  { code: 'NL', name: 'Países Bajos', dial: '+31' },
  { code: 'PK', name: 'Pakistán', dial: '+92' },
  { code: 'PA', name: 'Panamá', dial: '+507' },
  { code: 'PG', name: 'Papúa Nueva Guinea', dial: '+675' },
  { code: 'PY', name: 'Paraguay', dial: '+595' },
  { code: 'PE', name: 'Perú', dial: '+51' },
  { code: 'PL', name: 'Polonia', dial: '+48' },
  { code: 'PT', name: 'Portugal', dial: '+351' },
  { code: 'QA', name: 'Catar', dial: '+974' },
  { code: 'GB', name: 'Reino Unido', dial: '+44' },
  { code: 'RO', name: 'Rumania', dial: '+40' },
  { code: 'RU', name: 'Rusia', dial: '+7' },
  { code: 'RW', name: 'Ruanda', dial: '+250' },
  { code: 'SA', name: 'Arabia Saudita', dial: '+966' },
  { code: 'SN', name: 'Senegal', dial: '+221' },
  { code: 'RS', name: 'Serbia', dial: '+381' },
  { code: 'SL', name: 'Sierra Leona', dial: '+232' },
  { code: 'SG', name: 'Singapur', dial: '+65' },
  { code: 'SO', name: 'Somalia', dial: '+252' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94' },
  { code: 'ZA', name: 'Sudáfrica', dial: '+27' },
  { code: 'SD', name: 'Sudán', dial: '+249' },
  { code: 'SE', name: 'Suecia', dial: '+46' },
  { code: 'CH', name: 'Suiza', dial: '+41' },
  { code: 'SR', name: 'Surinam', dial: '+597' },
  { code: 'TH', name: 'Tailandia', dial: '+66' },
  { code: 'TZ', name: 'Tanzania', dial: '+255' },
  { code: 'TN', name: 'Túnez', dial: '+216' },
  { code: 'TR', name: 'Turquía', dial: '+90' },
  { code: 'UA', name: 'Ucrania', dial: '+380' },
  { code: 'UG', name: 'Uganda', dial: '+256' },
  { code: 'UY', name: 'Uruguay', dial: '+598' },
  { code: 'UZ', name: 'Uzbekistán', dial: '+998' },
  { code: 'VE', name: 'Venezuela', dial: '+58' },
  { code: 'VN', name: 'Vietnam', dial: '+84' },
  { code: 'YE', name: 'Yemen', dial: '+967' },
  { code: 'ZM', name: 'Zambia', dial: '+260' },
  { code: 'ZW', name: 'Zimbabue', dial: '+263' },
];

/**
 * Busca un país por su código ISO-2 (ej. 'CO').
 * @param {string} code — código ISO-2
 * @returns {object|undefined} {code, name, dial} o undefined
 */
export function findCountry(code) {
  if (!code) return undefined;
  const c = String(code).toUpperCase();
  return COUNTRIES.find(country => country.code === c);
}

/**
 * Genera el HTML de <option> para un <select> de países.
 * @param {string} defaultCode — código ISO-2 del país seleccionado por defecto (ej. 'CO')
 * @returns {string} HTML con todas las opciones
 */
export function buildCountryOptions(defaultCode = 'CO') {
  return COUNTRIES.map(({ code, name, dial }) => {
    const selected = code === defaultCode ? ' selected' : '';
    return `<option value="${code}" data-dial="${dial}"${selected}>${name} (${dial})</option>`;
  }).join('\n');
}

/**
 * Conecta un <select> de países con un elemento que muestra el código de marcación.
 * @param {string} selectId — id del <select>
 * @param {string} dialSpanId — id del elemento donde se muestra el prefijo
 */
export function bindCountryDial(selectId, dialSpanId) {
  const sel = document.getElementById(selectId);
  const span = document.getElementById(dialSpanId);
  if (!sel || !span) return;

  function update() {
    const opt = sel.options[sel.selectedIndex];
    const dial = opt ? (opt.getAttribute('data-dial') || '') : '';
    span.textContent = dial;
  }

  update(); // Inicializar con el valor actual
  sel.addEventListener('change', update);
}
