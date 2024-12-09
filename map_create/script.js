const aras = parent.aras;
const currentItem = parent.parent.item;

const latitudeElement = currentItem.getElementsByTagName("z_latitude")[0];
const longitudeElement = currentItem.getElementsByTagName("z_longitude")[0];
const lat = parseFloat(latitudeElement?.textContent || 16.0623180317);
const lng = parseFloat(longitudeElement?.textContent || 108.213958740234);

let zoomLevel = latitudeElement?.textContent && longitudeElement?.textContent ? 15 : 12;

// Initialize Map
const map = L.map("map", { zoomControl: false }).setView([lat, lng], zoomLevel);

L.tileLayer("https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png", {
    maxNativeZoom: 19,
    maxZoom: 20,
    minZoom: 3,
}).addTo(map);

L.control
    .zoom({
        position: "topright",
    })
    .addTo(map);

// Initialize Marker
const marker = L.marker([lat, lng], { draggable: parent.parent.isEditMode }).addTo(map);
map.setView([lat, lng], zoomLevel);

// Function to update marker's draggable state
function updateMarkerDraggableState(marker) {
    parent.parent.isEditMode ? marker.dragging.enable() : marker.dragging.disable();
    marker.on("dragend", function (e) {
        if (!parent.parent.isEditMode) return;
        const { lat, lng } = e.target.getLatLng();
        updateCoordinates(lat, lng);
    });
    setTimeout(() => updateMarkerDraggableState(marker), 100);
}

// Update coordinates in the parent window
function updateCoordinates(lat, lng) {
    window.parent.handleItemChange("z_latitude", lat);
    window.parent.handleItemChange("z_longitude", lng);
}

// Enable Leaflet-Geoman controls on the map
function enableGeoManControls(map) {
    map.pm.addControls({
        position: "topright",
        drawCircle: true, // Enable circle drawing
        drawCircleMarker: true, // Enable circle marker
    });

    map.on("pm:create", handleShapeCreate);
    map.on("pm:cut", handleShapeCut);
}

// Handle shape creation (Polygon)
function handleShapeCreate(e) {
    if (e.layer instanceof L.Polygon) {
        const geoJson = e.layer.toGeoJSON();
        console.log("Polygon GeoJSON:", geoJson);
        updatePolygon(geoJson);
    }
}

// Handle shape cut event
function handleShapeCut(e) {
    const geoJson = e.layer.toGeoJSON();
    console.log("Polygon with Hole GeoJSON:", geoJson);
    updatePolygon(geoJson);
}

// Update polygon coordinates in the parent window
function updatePolygon(coordinates) {
    window.parent.handleItemChange("z_polygon", JSON.stringify(coordinates));
}

updateMarkerDraggableState(marker);
enableGeoManControls(map);