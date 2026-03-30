const map = L.map('map', { zoomControl: false }).setView([-34.6037, -58.3816], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let markers = [];
let routeLine = null;

async function geocode(text) {
    return new Promise((resolve) => {
        L.esri.Geocoding.geocode().text(text).run((err, results) => {
            resolve(results?.results[0]?.latlng || null);
        });
    });
}

document.getElementById('btnCalcular').onclick = async () => {
    const inputO = document.getElementById('origen').value;
    const inputD = document.getElementById('destino').value;
    if (!inputO || !inputD) return;

    const btn = document.getElementById('btnCalcular');
    btn.innerText = "BUSCANDO...";
    btn.disabled = true;

    try {
        const [c1, c2] = await Promise.all([geocode(inputO), geocode(inputD)]);
        if (!c1 || !c2) throw new Error();

        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${c1.lng},${c1.lat};${c2.lng},${c2.lat}?overview=full&geometries=geojson`);
        const data = await res.json();
        const ruta = data.routes[0];

        if (routeLine) map.removeLayer(routeLine);
        markers.forEach(m => map.removeLayer(m));

        routeLine = L.geoJson(ruta.geometry, { style: { color: '#2563eb', weight: 5 } }).addTo(map);
        markers = [L.marker(c1).addTo(map), L.marker(c2).addTo(map)];
        map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });

        const km = ruta.distance / 1000;
        let precioBase = (km >= 50) ? 1500 : 1300;
        let total = km * precioBase;

        if (km >= 50) total *= 2; 
        else if (km > 30) total *= 1.6;
        else total *= 1.3;

        if (document.getElementById('bulto').checked) total += 6000;
        if (document.getElementById('retorno').checked) total += 6000;
        total += parseInt(document.getElementById('demora').value);
        if (document.getElementById('lluvia').checked) total *= 1.5;

        document.getElementById('dist').innerText = km.toFixed(1);
        document.getElementById('costo').innerText = Math.round(total).toLocaleString('es-AR');
    } catch (e) {
        alert("Dirección no encontrada. Intentá agregar ', CABA' al final.");
    } finally {
        btn.innerText = "CALCULAR AHORA";
        btn.disabled = false;
    }
};
