const map = L.map('map').setView([-34.6037, -58.3816], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let markers = [];
let routeLine = null;

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
    if (!inputO || !inputD) return alert("Ingresá origen y destino");

    const btn = document.getElementById('btnCalcular');
    btn.innerText = "CALCULANDO...";
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
            map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });

            const km = ruta.distance / 1000;
            const esLargo = km >= 50;
            let precioBase = esLargo ? (km * 1500) : (km * 1300);
            
            // Recargos
            if (km > 30 && km < 50) precioBase *= 1.60;
            if (km >= 50) precioBase *= 2.0; // Vuelta vacía

            if (document.getElementById('bulto').checked) precioBase += 6000;
            if (document.getElementById('retorno').checked) precioBase += 6000;
            precioBase += parseInt(document.getElementById('demora').value);
            if (document.getElementById('lluvia').checked) precioBase *= 1.50;

            document.getElementById('dist').innerText = km.toFixed(2);
            document.getElementById('costo').innerText = Math.round(precioBase).toLocaleString('es-AR');
        } else {
            alert("No se encontró una de las direcciones. Intentá ser más específico (ej: Warnes 86, CABA)");
        }
    } catch (e) {
        alert("Error de red. Verificá tu conexión.");
    } finally {
        btn.innerText = "CALCULAR RUTA Y COSTO";
        btn.disabled = false;
    }
};
