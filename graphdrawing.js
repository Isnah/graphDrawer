console.log('Starting map drawing.');

var map = L.map('map').setView([19.7, 113.2], 4.5);

// Add your tile layer here

var lineLayer = L.featureGroup().addTo(map);
var lineStyle = {
  "color": "#ff7800",
  "weight": 5,
  "opacity": 0.65
};

var markerLayer = L.featureGroup().addTo(map);

var markers = [];
var bindingMarkers = false;
var markerBindID = -1;
var taken_id = [];

function deleteMarker(marker_id) {
  let rem = markers.filter(function(v) {
    return v.id === marker_id
  })[0];

  markerLayer.removeLayer(rem.marker);

  let index = markers.indexOf(rem);
  if(index > -1) {
    markers.splice(index, 1);
  }

  index = taken_id.indexOf(rem.id);
  taken_id.splice(index, 1);

  let i;
  for(i = 0; i < rem.neighbors.length; i++) {
    let neighbor = markers.filter(function(v) {
      return v.id === parseInt(rem.neighbors[i]);
    })[0];

    console.log(neighbor);

    index = neighbor.neighbors.indexOf(rem.id);
    if(index > -1) {
      neighbor.neighbors.splice(index, 1);
    }
  }
  redrawLines();
}

function redrawLines() {
  lineLayer.clearLayers();
  let i;
  for(i = 0; i < markers.length; i++) {
    let j;
    for(j = 0; j < markers[i].neighbors.length; j++) {
      let targ = markers.filter(function(v) {
        return v.id === markers[i].neighbors[j];
      })[0];

      if(targ) {
        var line = L.polyline([markers[i].marker.getLatLng(), targ.marker.getLatLng()], lineStyle);
        line.addTo(lineLayer);
      }
    }
  }
}

function loadMap(file) {
  markerLayer.clearLayers();
  lineLayer.clearLayers();
  var neighbor_list = {};
  markers = [];
  taken_id = [];
  bindingMarkers = false;
  markerBindID = -1;

  let reader = new FileReader();
  reader.onload = function(progressEvent) {
    console.log("reading file");
    let lines = this.result.split('\n');

    for(let i = 0; i < lines.length; i++) {
      line = lines[i].split(',');
      if(line.length < 2) {
        continue;
      }
      explicitCreateMarker(parseInt(line[0]), line[1], line[2]);
      var neighbors = [];
      for(let j = 3; j < line.length; j++) {
        if(line[j] === '') {
          break;
        }
        neighbors.push(parseInt(line[j]));
      }
      neighbor_list[line[0]] = (neighbors);
    }

    for(let i in neighbor_list) {
      i = parseInt(i);
      let marker_1 = markers.filter(function(v) {
        return v.id === i;
      })[0];

      for(let j = 0; j < neighbor_list[i].length; j++) {
        let marker_2 = markers.filter(function(v) {
          return v.id === neighbor_list[i][j];
        })[0];

        if(marker_1.neighbors.indexOf(marker_2.id) === -1 && marker_2.neighbors.indexOf(marker_1.id) === -1) {
          let x = parseInt(neighbor_list[i][j])
          marker_1.neighbors.push(x);
          marker_2.neighbors.push(i);
        }
      }
    }
    redrawLines();
  };
  reader.readAsText(file);
}

function bindMarker(marker_id) {
  if(bindingMarkers) {
    bindingMarkers = false;
    if(marker_id === markerBindID) {
      return undefined;
    }
    let marker_1 = markers.filter(function(v) {
      return v.id === marker_id;
    })[0];
    let marker_2 = markers.filter(function(v) {
      return v.id === markerBindID;
    })[0];

    if(marker_1.neighbors.indexOf(marker_2.id) > -1) {
      return undefined;
    }

    marker_1.neighbors.push(markerBindID);
    marker_2.neighbors.push(marker_id);
    let line = L.polyline([marker_1.marker.getLatLng(), marker_2.marker.getLatLng()], lineStyle);
    line.addTo(lineLayer);
  } else {
    bindingMarkers = true;
    markerBindID = marker_id;
  }
}


function explicitCreateMarker(id, lat, lng) {
  var marker = L.marker([lat,lng], {draggable: true}).addTo(markerLayer);

  marker.bindPopup(
    "<p>You clicked a node</p>" +
    "<p>What do you wish to do?</p>" +
    "<button onClick='deleteMarker(" + id + ")'>Delete node</button>" +
    "<button onClick='bindMarker(" + id + ")'>Bind node</button>"
  );
  markers.push({'id':id, 'marker': marker, 'neighbors': []});
  taken_id.push(id);
  taken_id.sort(function(a,b) {
    return  a < b ? -1
          : b < a ?  1
          : 0;
  });

  marker.on('dragend', function(ev) {
    redrawLines();
  });
}


function createMarker(lat, lng) {
  var marker = L.marker([lat,lng], {draggable: true}).addTo(markerLayer);
  var this_id = 0;
  let i;
  for(i = 0; i < taken_id.length; i++) {
    if(i < taken_id[i]) {
      break;
    }
  }
  this_id = i;

  marker.bindPopup(
    "<p>You clicked a node</p>" +
    "<p>What do you wish to do?</p>" +
    "<button onClick='deleteMarker(" + this_id + ")'>Delete node</button>" +
    "<button onClick='bindMarker(" + this_id + ")'>Bind node</button>"
  );
  markers.push({'id':this_id, 'marker': marker, 'neighbors': []});
  taken_id.push(this_id);
  taken_id.sort(function(a,b) {
    return  a < b ? -1
          : b < a ?  1
          : 0;
  });

  marker.on('dragend', function(ev) {
    redrawLines();
  });
}

map.on('click', function(e) {
  let popup = L.popup();
  popup.setLatLng(e.latlng).setContent(
    "<p>You clicked the map at " + e.latlng.toString() + "</p>" +
    "<button onClick='createMarker(" + e.latlng.lat + "," + e.latlng.lng + ")'>Create node</button>"
  ).openOn(map);
});

$(document).ready(function() {
  $("#showGraphBtn").click(function() {
    $("#graphlist").empty();
    let i;
    for(i = 0; i < markers.length; i++) {
      let text = "<li>id: " + markers[i].id +
                 "\npos: " + markers[i].marker.getLatLng().toString() +
                 "\nneighbors: [" + markers[i].neighbors + "]</li>";
      $("#graphlist").append(text);
    }
  });

  $("#saveGraphBtn").click(function() {
    var csvContent = "data:text/csv;charset=utf-8,";
    //var csvContent = "data:text;charset=utf-8";
    markers.forEach(function(infoArray, index) {
      let lat = infoArray.marker.getLatLng().lat;
      let lng = infoArray.marker.getLatLng().lng;
      dataString = "" + infoArray.id + ", " + [lat, lng] + "," + infoArray.neighbors;
      csvContent += index < markers.length ? dataString + "\n" : dataString;
    });

    var encodedUri = encodeURI(csvContent);

    var hiddenLink = document.createElement('a');
    hiddenLink.href = encodedUri;
    hiddenLink.target = '_blank';
    hiddenLink.download = 'navGraph.csv';
    hiddenLink.click();
  });

  $("#fileInp").change(function() {
    console.log("loading data");
    let filename = $("#fileInp").val();
    let file = document.getElementById('fileInp').files[0];

    loadMap(file);
  });
});
