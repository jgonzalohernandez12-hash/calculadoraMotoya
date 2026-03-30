const map = L.map('map').setView([-34.6037, -58.3816], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let markers = [];
let routeLine = null;

// Buscador de coordenadas
async function geocode(text) {
    return new Promise((resolve) => {
        L.esri.Geocoding.geocode().text(text).run(function (err, results) {
            if (results && results.results.length > 0) {
                resolve(results.results[0].latlng);
            } else { resolve(null); }
        });
    });
}

document.getElementById('btnCalcular').onclick = async () => {
    const inputO = document.getElementById('origen').value;
    const inputD = document.getElementById('destino').value;
    
    if (!inputO || !inputD) return alert("Por favor, ingresá origen y destino");

    const btn = document.getElementById('btnCalcular');
    btn.innerText = "BUSCANDO...";
    btn.disabled = true;

    try {
        const c1 = await geocode(inputO);
        const c2 = await geocode(inputD);

        if (c1 && c2) {
            markers.forEach(m => map.removeLayer(m));
            if (routeLine) map.removeLayer(routeLine);

            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${c1.lng},${c1.lat};${c2.lng},${c2.lat}?overview=full&geometries=geojson`);
            const data = await res.json();
            const ruta = data.routes[0];

            routeLine = L.geoJSON(ruta.geometry, { style: { color: '#2563eb', weight: 6 } }).addTo(map);
            markers = [L.marker(c1).addTo(map), L.marker(c2).addTo(map)];
            map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

            const km = ruta.distance / 1000;
            
            // --- LÓGICA DE PRECIOS ACTUALIZADA ---
            // Si es largo (>=50km), base de $1500. Si no, $1300.
            let precioPorKm = (km >= 50) ? 1500 : 1300;
            let subtotal = km * precioPorKm;

            // Recargos por distancia
            if (km >= 50) {
                subtotal *= 2.0; // +100% Recargo viaje largo
            } else if (km > 30) {
                subtotal *= 1.60; // +60% Media distancia
            } else {
                subtotal *= 1.30; // +30% Cercanía
            }

            // Adicionales
            if (document.getElementById('bulto').checked) subtotal += 6000;
            if (document.getElementById('retorno').checked) subtotal += 6000;
            subtotal += parseInt(document.getElementById('demora').value);

            // Lluvia (sobre el total acumulado)
            if (document.getElementById('lluvia').checked) subtotal *= 1.50;

            document.getElementById('dist').innerText = km.toFixed(2);
            document.getElementById('costo').innerText = Math.round(subtotal).toLocaleString('es-AR');

        } else {
            alert("No se encontró una de las direcciones. Intentá ser más específico.");
        }
    } catch (e) {
        alert("Error de conexión con el servidor de mapas. Reintentá.");
    } finally {
        btn.innerText = "CALCULAR RUTA Y COSTO";
        btn.disabled = false;
    }
};
