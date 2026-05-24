mapboxgl.accessToken = typeof mapToken !== 'undefined' ? mapToken : '';

document.addEventListener('DOMContentLoaded', function() {
  const dataScript = document.getElementById('listing-data');
  let listing = null;
  
  if (dataScript) {
    try {
      listing = JSON.parse(dataScript.textContent || dataScript.innerText);
    } catch(e) {
      console.error('JSON parse error:', e);
    }
  }
  
  const coords = listing && listing.geometry && listing.geometry.coordinates ? listing.geometry.coordinates : [73.195, 26.971];
  
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: coords,
    zoom: 13
  });

  map.on('load', function() {
    const size = 30;
    const markerDiv = document.createElement('div');
    markerDiv.className = 'custom-marker';
    
    const markerContent = document.createElement('div');
    markerContent.style.cssText = 'position: relative; width: ' + size + 'px; height: ' + size + 'px; background-color: #FF5A5F; border: 2px solid white; border-radius: 50%; cursor: pointer; transform: translate(-50%, -50%); box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    
    markerDiv.appendChild(markerContent);
    
    new mapboxgl.Marker({
      element: markerDiv,
      anchor: 'bottom'
    })
    .setLngLat(coords)
    .setPopup(new mapboxgl.Popup({ offset: [0, -25] }).setHTML(`
      <div>
        <h6 style="margin: 0 0 5px 0; color: #FF5A5F;">${listing ? listing.title : 'Exact Location'}</h6>
        <p style="margin: 0; font-size: 14px;"><i class="fas fa-map-marker-alt" style="color: #666;"></i> ${listing ? listing.location + ', ' + listing.country : 'India'}</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Reveal after booking</p>
      </div>
    `))
    .addTo(map);

    map.flyTo({
      center: coords,
      zoom: 14.5,
      bearing: 0,
      pitch: 45,
      duration: 2500,
      essential: true
    });
  });
  
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');
});

