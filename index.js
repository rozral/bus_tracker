const key = '2KQRZHRxkYAevnNpHX3jZpPZ6PP3KGzGzUOswR4A' // left unprotected while in testing
const imageUrl = './media/map.gif';
const latLngBounds = [[-1, -1], [1, 1]];
const zscale = -10965; // use map image size (e.g. 10965x10965)
const xscale = 10965;
function to_leaflet_coord(z,x) {
    return ([z/zscale,x/xscale]);
}

var map = L.map('map');
var imageOverlay = L.imageOverlay(imageUrl, latLngBounds).addTo(map);
map.setView([0,0], 10);


async function main() {
    const settings = await get_data('settings');
    var bus_markers = new Map();

    function init() {
        stops = settings.stops
        stop_marker = L.icon({iconUrl:'./media/stop_icon.png', iconSize:[10,10]})
        for (const i in stops) {
            stop_name = stops[i].name
            z = stops[i].positionZ
            x = stops[i].positionX

            new_marker = L.marker(to_leaflet_coord(z,x));
            new_marker.bindPopup(stop_name);
            new_marker.setIcon(stop_marker);
            
            map.addLayer(new_marker);
        }
    }
    init()

    function generate_icon(background_color, rotation, text, text_color) {
        const icon = L.divIcon({
            html: `
            <div class="marker_container" style="display: flex; align-items: center; justify-content: center; text-align:center">
                <img src="./media/marker_icon.png" style="width:30px; height:30px; rotate:${rotation}deg">
                <div style="z-index:-1; width:19px; height:19px; color:${text_color}; background-color:${background_color}; border-radius:50%; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:12px; font-weight:bold;">${text}</div>
            </div>
            `,
            iconSize: [30, 30],
            popupAnchor: [0, -10]
        });
        return icon;
    }


    setInterval(async () => {
        const data = await get_data('data');
        if (Math.abs(data.timestamp - (new Date().getTime())*0.001) < 20 && data.hasOwnProperty("bus_data")) {
            const bus_data = data.bus_data
            var registered_units = []

            for (const i in bus_data) {
                const name = i
                const z = bus_data[i].z
                const x = bus_data[i].x
                const speed = Math.round(bus_data[i].speed)
                const driver = bus_data[i].driver
                const rotation = bus_data[i].orientation * -1
                const route = bus_data[i].route
                const destination = bus_data[i].destination
                const color = (bus_data[i].route in settings.colors) ? settings.colors[bus_data[i].route].background : "rgb(211,211,211)";
                const textcolor = (bus_data[i].route in settings.colors) ? settings.colors[bus_data[i].route].text : "rgb(0,0,0)";

                
                registered_units.push(i);

                if (bus_markers.has(i)) { // handle changes to existing marker
                    marker = bus_markers.get(i);
                    marker.setLatLng(to_leaflet_coord(z,x));
                    marker.getPopup().setContent(`<i>${i}</i><br><b>${route} ${destination}</b><br>Ātrums: ${speed} km/h<br>`);
                    new_marker.setIcon(generate_icon(color, rotation, route, textcolor));
                } else { // create marker for new unit
                    new_marker = L.marker(to_leaflet_coord(z,x));
                    new_marker.bindPopup(`<i>${i}</i><br><b>${route} ${destination}</b><br>Ātrums: ${speed} km/h<br>`);
                    new_marker.setIcon(generate_icon(color, rotation, route, textcolor));
                    
                    bus_markers.set(i, new_marker);
                    map.addLayer(bus_markers.get(i));
                }
            }

            for (let key of bus_markers.keys()) { // handle vehicle deletion (unused marker cleanup)
                if (!registered_units.includes(key)) {
                    map.removeLayer(bus_markers.get(key))
                    bus_markers.delete(key)
                }
            }
        } else { // handling old data (server not active anymore)
            for (let key of bus_markers.keys()) { // handle vehicle deletion (unused marker cleanup)
                map.removeLayer(bus_markers.get(key))
                bus_markers.delete(key)
            }
        }
    }, 5000); // 5000 => 5sec
}
main();


async function get_data(table) {
    async function fetchAsync(url) {
        try {
            let response = await fetch(url);
            let data = await response.json();
            return data;
        } catch (error) {
            console.log(error);
        }
    }
    return fetchAsync(`https://luganedb-default-rtdb.europe-west1.firebasedatabase.app/${table}.json?auth=${key}`);
}