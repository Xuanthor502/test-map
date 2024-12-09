// Aras Innovator
const aras = window.parent.parent.aras;
const inn = aras.newIOMInnovator();

// Initialize map
const map = L.map("map_view", { zoomControl: false }).setView([17, 108], 5);
L.tileLayer("http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
    maxNativeZoom: 19,
    maxZoom: 20,
    minZoom: 3,
    subdomains:['mt0','mt1','mt2','mt3']
}).addTo(map);

L.control
    .zoom({
        position: "topright",
    })
    .addTo(map);

// Initialize the parameters needed to display the Map
const popup = L.popup({ offset: [0, -28] });
const PADDING = [15, 15];
const MAXZOOM = 18;
const DURATION = 0.5;
const markersCluster = L.markerClusterGroup({
    spiderfyOnMaxZoom: false,
    disableClusteringAtZoom: 14,
});
let isMenuOpen = false;
let isClick = false;

// Fetch location data and add markers to map
const locationData = fetchLocationData();
const markersLocation = addMarkersToMap(locationData, markersCluster);

const searchField = document.getElementById("search_field");
const searchInput = document.getElementById("search_input");
const myLocationButton = document.getElementById("my_location");

// Search action handler when click search button
searchActionHandler(
    searchField,
    searchInput,
    locationData,
    markersLocation,
    markersCluster
);
// Close search field when click close button
closeSearchField(searchField, searchInput, markersLocation, markersCluster);

// Get location data from server aras
function fetchLocationData() {
    const res = aras.applyMethod("z_getAllLocation");
    const data = aras.IomInnovator.newItem();
    data.loadAML(res);

    if (data.isError()) return [];

    const locationData = [];
    const count = data.getItemCount();

    for (let i = 0; i < count; i++) {
        const item = data.getItemByIndex(i);
        const id = item.getID();
        const name = item.getProperty("z_location_name", "");
        const address = item.getProperty("z_detailed_address", "");
        const latitude = item.getProperty("z_latitude", "0");
        const longitude = item.getProperty("z_longitude", "0");
        if (!latitude || !longitude) continue;
        locationData.push({ id, name, address, latitude, longitude });
    }

    return locationData;
}

function addMarkersToMap(locationData, markersCluster) {
    const markersLocation = locationData.map((location) => {
        // const mapMarker = L.AwesomeMarkers.icon({
        //     prefix: "fa",
        //     icon: "fa-map-marker",
        //     iconColor: "red",
        // });

        const marker = L.marker([location.latitude, location.longitude], {
            id: location.id,
            // icon: mapMarker,
        }).on("click", (e) => {
            map.flyTo(e.latlng, MAXZOOM, { duration: DURATION });
            reloadTGV(location.id);
        });
        addEventMarker(marker, location);
        markersCluster.addLayer(marker);

        return marker;
    });
    map.addLayer(markersCluster);
    return markersLocation;
}

function addEventMarker(marker, location) {
    const content = `
    <h3 class="location_name">${location.name}</h3>
    <p class="location_address">${location.address}</p>`;
    // Hover to show popup
    marker.addEventListener("mouseover", (e) => {
        if (!isClick) {
            popup.setLatLng(e.latlng).setContent(content).openOn(map);
        }
    });

    marker.addEventListener("mouseout", () => {
        if (!isClick) {
            map.closePopup();
        }
    });

    marker.addEventListener("click", (e) => {
        isClick = true;
        popup.setLatLng(e.latlng).setContent(content).openOn(map);
    });

    // Map event
    map.on("click", () => {
        map.closePopup();
        reloadTGV("");
    });

    map.on("popupclose", (e) => {
        isClick = false;
    });
}

// Remove vietnameses characters
function normalizeString(str) {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
}

// Search location by name and address
function searchLocation(
    searchValue,
    locationData,
    markersLocation,
    markersCluster
) {
    const search = normalizeString(searchValue);

    const searchResult = markersLocation.filter((marker, index) => {
        const location = locationData[index];
        // Search by name and address with both normalized and lowercase
        const name = normalizeString(location.name);
        const address = normalizeString(location.address);

        return name.includes(search) || address.includes(search);
    });

    markersCluster.clearLayers();
    searchResult.forEach((marker) => markersCluster.addLayer(marker));
}

// All action handler for search field
function searchActionHandler(
    searchField,
    searchInput,
    locationData,
    markersLocation,
    markersCluster
) {
    const searchButton = document.getElementById("search_button");
    // Search action handler
    const handleSearch = () => {
        searchField.classList.add("active");
        searchInput.focus();
        if (searchField.classList.contains("active")) {
            const searchValue = searchInput.value.trim();
            searchLocation(
                searchValue,
                locationData,
                markersLocation,
                markersCluster
            );
        }
    };

    searchButton.addEventListener("click", (e) => {
        e.stopPropagation();
        handleSearch();
    });

    // Keymap for search button
    searchInput.addEventListener("keyup", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            searchButton.click();
        }
    });
}

function closeSearchField(
    searchField,
    searchInput,
    markersLocation,
    markersCluster
) {
    const closeSearchButton = document.getElementById("search_cancel");
    closeSearchButton.addEventListener("click", (e) => {
        e.stopPropagation();
        searchField.classList.remove("active");
        searchInput.value = "";
        markersCluster.clearLayers();
        markersLocation.forEach((marker) => markersCluster.addLayer(marker));
    });
}

// Reload Location's TGV when click on marker, if id is not provided, reload TGV
function reloadTGV(id) {
    const dashboardEditor = aras
        .getMostTopWindowWithAras(window)
        .document.getElementById("dashboard-editor");
    if (dashboardEditor) {
        const iframeList = dashboardEditor.getElementsByTagName("iframe");
        for (let i = 0; i < iframeList.length; i++) {
            const iframe = iframeList[i];
            // Trường hợp iframe hiện tại là TGV
            if (iframe.src.includes("TreeGridViewWidget")) {
                // Reload TGV dựa theo id của item được chọn
                const url = new URL(iframe.src);
                url.searchParams.set(
                    "startConditionProvider",
                    "parent.startConditionProviderForWidget(" + id + ")"
                );
                iframe.src = url.href;
            }
        }
    }
}

myLocationButton.addEventListener("click", (e) => {
    e.stopPropagation();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log(position.coords);
                const { latitude, longitude } = position.coords;
                map.flyTo([latitude, longitude], MAXZOOM, {
                    duration: DURATION,
                });
                L.marker([latitude, longitude], {
                    icon: L.AwesomeMarkers.icon({
                        prefix: "fa",
                        icon: "fa-map-marker",
                        iconColor: "red",
                    }),
                }).addTo(map);
            },
            (error) => {
                console.error("Error getting user location:", error);
            }
        );
    } else {
        console.error("Geolocation is not supported by this browser.");
    }
});
