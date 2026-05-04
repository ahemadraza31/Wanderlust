// Initialize the map with Leaflet + OpenStreetMap (100% FREE - No API key needed)
const map = L.map("map", {
  center: [listing.geometry.coordinates[1], listing.geometry.coordinates[0]],
  zoom: 1,
  scrollWheelZoom: false,
});

// Add OpenStreetMap tile layer (free, no API key required)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);

// Create a custom pulsing icon using CSS
const pulsingIcon = L.divIcon({
  className: "custom-pulsing-marker",
  html: `<div class="pulse-marker"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Add marker with popup
const marker = L.marker(
  [listing.geometry.coordinates[1], listing.geometry.coordinates[0]],
  { icon: pulsingIcon }
)
  .addTo(map)
  .bindPopup(
    `<h6>${listing.title}</h6><p><b>${listing.location}, ${listing.country}</b></p><p>Exact location will be provided after booking!</p>`
  )
  .openPopup();

// Auto zoom animated transition
setTimeout(() => {
  map.flyTo(
    [listing.geometry.coordinates[1], listing.geometry.coordinates[0]],
    12,
    {
      duration: 3,
    }
  );
}, 500);

// Add zoom controls
L.control.zoom({ position: "topright" }).addTo(map);

// Add fullscreen control
map.addControl(new L.Control.Fullscreen());

// Custom zoom functions for the +/- buttons
let zoomin = () => {
  console.log("zoom in");
  let zoomP = map.getZoom();
  if (zoomP < 18) {
    zoomP++;
  }
  map.setZoom(zoomP);
};

let zoomout = () => {
  console.log("zoom out");
  let zoomM = map.getZoom();
  if (zoomM > 0) {
    zoomM--;
  }
  map.setZoom(zoomM);
};

