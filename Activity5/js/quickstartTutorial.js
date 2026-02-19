// initialize the map with desired coordinates and zoom level
var map = L.map('map').setView([51.505, -0.09], 13);

// adds map tile to map with max zoom and credit tag
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// add marker to the map
var marker = L.marker([51.5, -0.09]).addTo(map);

// add circle to map
var circle = L.circle([51.508, -0.11], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 500
}).addTo(map);

// add polygon
var polygon = L.polygon([
    [51.509, -0.08],
    [51.503, -0.06],
    [51.51, -0.047]
]).addTo(map);

// add popups to existing elements through dot notation
marker.bindPopup("<b>Hello world!</b><br>I am a popup.").openPopup(); // .openPopup() opens automatically for markers only
circle.bindPopup("I am a circle."); // bindPopup() creates popup after element is clicked
polygon.bindPopup("I am a polygon.");

// add standalone popup at a set location with text
var popup = L.popup()
    .setLatLng([51.513, -0.09])
    .setContent("I am a standalone popup.")
    .openOn(map); // .openOn() opens upon load and closes when other elements are clicked

// creates popup variable to pass to function
var popup = L.popup();

// function to react to user clicks #feedback
function onMapClick(e) {
    popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(map);
}

// add onMapClick functionality to the map
map.on('click', onMapClick);

