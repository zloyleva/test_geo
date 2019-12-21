var platform = new H.service.Platform({
  'apikey': 'JI5JE0wnbkjnEbW1MQkOFu50zogofG_CVsPBL7TSuZo'
});
var targetElement = document.getElementById('map');
var defaultLayers = platform.createDefaultLayers();
var map = new H.Map(
  document.getElementById('map'),
  defaultLayers.raster.normal.map,
  {
    zoom: 10,
    center: { lat: 48.4593, lng: 35.0387 },
    engineType: H.map.render.RenderEngine.EngineType.P2D
  });
var mapEvents = new H.mapevents.MapEvents(map);
var behavior = new H.mapevents.Behavior(mapEvents);
var ui = new H.ui.UI.createDefault(map, defaultLayers, 'ru-RU');

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1);  // deg2rad below
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180)
}

let url = 'https://zloyleva.github.io/test_geo/data.json';
// let url = 'https://api.privatbank.ua/p24api/infrastructure?json&atm&address=&city=%D0%94%D0%BD%D1%96%D0%BF%D1%80%D0%BE';
fetch(url, {
  headers: {
    'Content-Type': 'application/json',
},
})
  .then(result => result.json())
  .then(result => {
    let atms = result.devices;
    atms = atms.map(item => ({
      lat: item.longitude,
      lon: item.latitude,
      adr: item.fullAddressUa,
    }));

    navigator.geolocation.getCurrentPosition(pos => {
      let lat = pos.coords.latitude;
      let lon = pos.coords.longitude;

      let url_my = `https://reverse.geocoder.ls.hereapi.com/6.2/reversegeocode.json?apiKey=JI5JE0wnbkjnEbW1MQkOFu50zogofG_CVsPBL7TSuZo&mode=retrieveAddresses&prox=${lat},${lon}`;
      fetch(url_my)
        .then(result => result.json())
        .then(result => {
          var new_adress = result.Response.View[0].Result[1].Location.Address.Label;
          var bubble = new H.ui.InfoBubble({ lng: `${lon}`, lat: `${lat}` }, {
            content: `${new_adress}`
          });

          // Add info bubble to the UI:
          ui.addBubble(bubble);
        })



      atms.forEach(item => {
        item.distance = Math.round(getDistanceFromLatLonInKm(lat, lon, item.lat, item.lon) * 1000);
      });

      console.log('atms', atms)

      atms.sort((a, b) => a.distance - b.distance);
      var new_atms = atms[0];
      var add_1 = new_atms.adr;
      var add_2 = add_1.substr(46);
      var bubble = new H.ui.InfoBubble({ lng: `${new_atms.lon}`, lat: `${new_atms.lat}` }, {
        content: `${add_2}, відстань ${new_atms.distance} метр`
      });

      // Add info bubble to the UI:
      ui.addBubble(bubble);

      var routingParameters = {
        // The routing mode:
        'mode': 'fastest;car',
        // The start point of the route:
        'waypoint0': `geo!${lat},${lon}`,
        // The end point of the route:
        'waypoint1': `geo!${new_atms.lat},${new_atms.lon}`,
        // To retrieve the shape of the route we choose the route
        // representation mode 'display'
        'representation': 'display'
      };

      // Define a callback function to process the routing response:
      var onResult = function (result) {
        var route,
          routeShape,
          startPoint,
          endPoint,
          linestring;
        if (result.response.route) {
          // Pick the first route from the response:
          route = result.response.route[0];
          // Pick the route's shape:
          routeShape = route.shape;

          // Create a linestring to use as a point source for the route line
          linestring = new H.geo.LineString();

          // Push all the points in the shape into the linestring:
          routeShape.forEach(function (point) {
            var parts = point.split(',');
            linestring.pushLatLngAlt(parts[0], parts[1]);
          });

          // Retrieve the mapped positions of the requested waypoints:
          startPoint = route.waypoint[0].mappedPosition;
          endPoint = route.waypoint[1].mappedPosition;

          // Create a polyline to display the route:
          var routeLine = new H.map.Polyline(linestring, {
            style: { strokeColor: 'blue', lineWidth: 3 }
          });

          // Create a marker for the start point:
          var startMarker = new H.map.Marker({
            lat: startPoint.latitude,
            lng: startPoint.longitude
          });

          // Create a marker for the end point:
          var endMarker = new H.map.Marker({
            lat: endPoint.latitude,
            lng: endPoint.longitude
          });

          // Add the route polyline and the two markers to the map:
          map.addObjects([routeLine, startMarker, endMarker]);

          // Set the map's viewport to make the whole route visible:
          map.getViewModel().setLookAtData({ bounds: routeLine.getBoundingBox() });
        }
      };

      // Get an instance of the routing service:
      var router = platform.getRoutingService();

      // Call calculateRoute() with the routing parameters,
      // the callback and an error callback function (called if a
      // communication error occurs):
      router.calculateRoute(routingParameters, onResult,
        function (error) {
          alert(error.message);
        });
    })
  })
