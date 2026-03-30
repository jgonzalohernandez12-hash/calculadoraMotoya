// 1. Inicialización del Mapa
const map = L.map('map').setView([-34.6037, -58.3816], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let markers = [];
let routeLine = null;

// 2. Geocoding restringido a Argentina
function geocode(text) {
    return new Promise((resolve) => {
        L.esri.Geocoding.geocode({
            requestParams: {
                location: "-34.6037, -58.3816",
                distance: 50000,
                countryCode: "ARG"
            }
        }).text(text).run(function (err, results) {
            if (results && results.results.length > 0) {
                resolve(results.results[0].latlng);
            } else { resolve(null); }
        });
    });
}

// 3. Obtener ruta real
async function obtenerRutaReal(p1, p2) {
    const url = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    return await response.json();
}

// 4. Tarifas CABA
function calcularTarifaCABA(km) {
    if (km <= 3) return 11000;
    if (km <= 6) return 13000;
    if (km <= 9) return 17000;
    if (km <= 12) return 20000;
    if (km <= 15) return 22000;
    if (km <= 20) return 25000;
    return 25000 + ((km - 20) * 1300); 
}

// 5. Lógica de Cálculo
document.getElementById('btnCalcular').onclick = async () => {
    const inputO = document.getElementById('origen').value.toLowerCase();
    const inputD = document.getElementById('destino').value.toLowerCase();
    
    if (!inputO || !inputD) return alert("Por favor, ingresá origen y destino");

    const btn = document.getElementById('btnCalcular');
    btn.innerText = "CALCULANDO...";
    btn.disabled = true;

    try {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));
        const coords1 = await Promise.race([geocode(inputO), timeout]);
        const coords2 = await Promise.race([geocode(inputD), timeout]);

        if (coords1 && coords2) {
            markers.forEach(m => map.removeLayer(m));
            if (routeLine) map.removeLayer(routeLine);

            const data = await obtenerRutaReal(coords1, coords2);
            const ruta = data.routes[0];
            routeLine = L.geoJSON(ruta.geometry, { style: { color: '#e94560', weight: 6 } }).addTo(map);
            markers = [L.marker(coords1).addTo(map), L.marker(coords2).addTo(map)];
            map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

            const km = ruta.distance / 1000;
            let subtotal = 0;

            // --- DETERMINAR ZONA ---
            const esProvincia = inputO.includes("provincia") || inputD.includes("provincia") || 
                               inputO.includes("pba") || inputD.includes("pba") ||
                               inputO.includes("alsina") || inputO.includes("lanus") ||
                               inputD.includes("campana") ||
                               (!inputO.includes("caba") && !inputD.includes("caba") && !inputO.includes("buenos aires"));

            if (esProvincia) {
                subtotal = km * 1300;
            } else {
                subtotal = calcularTarifaCABA(km);
            }

            // --- SUMAR ADICIONALES FIJOS ---
            if (document.getElementById('bulto').checked) subtotal += 6000;
            if (document.getElementById('retorno').checked) subtotal += 6000;
            subtotal += parseInt(document.getElementById('demora').value);

            // --- RECARGO ESCALONADO ACTUALIZADO (A PARTIR DE 50KM X2) ---
            let totalActual = subtotal;
            if (esProvincia) {
                if (km >= 50) {
                    totalActual = subtotal * 2.0; // +100% (Doble por superar 50km)
                } else if (km > 30) {
                    totalActual = subtotal * 1.60; // +60% (Media distancia)
                } else {
                    totalActual = subtotal * 1.30; // +30% (Cercanía)
                }
            }

            // --- RECARGO POR LLUVIA (+50%) ---
            if (document.getElementById('lluvia').checked) {
                totalActual = totalActual * 1.50;
            }

            document.getElementById('dist').innerText = km.toFixed(2);
            document.getElementById('costo').innerText = Math.round(totalActual).toLocaleString('es-AR');

        } else {
            alert("No se encontró la dirección.");
        }
    } catch (error) {
        alert("Error de conexión. Reintentá.");
    } finally {
        btn.innerText = "CALCULAR RUTA Y COSTO";
        btn.disabled = false;
    }
};