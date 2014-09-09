var map, map2, featureList, gpsActive, activeRecord;

/* URL parameters */
var urlParams = {};
if (location.search) {
  var parts = location.search.substring(1).split("&");
  for (var i = 0; i < parts.length; i++) {
    var nv = parts[i].split("=");
    if (!nv[0]) continue;
    urlParams[nv[0]] = nv[1] || true;
  }
}

/* Basemap Layers */
var mapboxOSM = L.tileLayer("http://{s}.tiles.mapbox.com/v3/spatialnetworks.map-6l9yntw9/{z}/{x}/{y}.jpg70", {
  maxZoom: 19,
  subdomains: ["a", "b", "c", "d"],
  attribution: 'Basemap <a href="https://www.mapbox.com/about/maps/" target="_blank">© Mapbox © OpenStreetMap</a>'
});
var mapboxSat = L.tileLayer("http://{s}.tiles.mapbox.com/v3/spatialnetworks.map-xkumo5oi/{z}/{x}/{y}.jpg70", {
  maxZoom: 19,
  subdomains: ["a", "b", "c", "d"],
  attribution: 'Basemap <a href="https://www.mapbox.com/about/maps/" target="_blank">© Mapbox © OpenStreetMap</a>'
});

/* Overlay Layers */
var highlight = L.geoJson(null);
var markerClusters = new L.MarkerClusterGroup({
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
  disableClusteringAtZoom: 17
});
var observations = L.geoJson(null, {
  pointToLayer: function (feature, latlng) {
    return L.marker(latlng, {
      title: feature.properties.Title,
      riseOnHover: true
    });
  },
  onEachFeature: function (feature, layer) {
    function formatPhotos(value) {
      if (value) {
        return "<a href='#' onclick='photoGallery(\"" + value + "\"); return false;'>View Photo</a>";
      } else {
        return "<i>No photo available</i>";
      }
    }
    if (feature.properties) {
      var content = "<table class='table table-striped table-bordered table-condensed'>";
      $.each(feature.properties, function(index, value) {
        if (index === "Photo") {
          value = formatPhotos(value);
        }
        if (index === "Timestamp") {
          value = new Date(value).toLocaleString();
        }
        if (value === null) {
          value = "";
        }
        if (index !== "id") {
          content += "<tr><th>" + index + "</th><td>" + value + "</td></tr>";
        }
      });
      content += "</table>";
      layer.on({
        click: function (e) {
          $("#feature-title").html(feature.properties.Title);
          $("#info-tab").html(content);
          $("#feature-tabs a:first").tab("show");
          $("#featureModal").modal("show");
          activeRecord = feature.properties.id;
          fetchComments();
          highlight.clearLayers().addLayer(L.circleMarker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], {
            stroke: false,
            fillColor: "#00FFFF",
            fillOpacity: 0.7,
            radius: 10
          }));
        }
      });
      $("#feature-list tbody").append('<tr class="feature-row" id="'+L.stamp(layer)+'"><td class="feature-name">'+layer.feature.properties.Title+'</td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>');
    }
  }
});

/* Fetch data to populate form dropdowns */
$(document).ready(function() {
  fetchLookups();
  loadObservations();
});

/* Dynamic sidebar click listener */
$(document).on("click", ".feature-row", function(e) {
  sidebarClick(parseInt($(this).attr('id')));
});

/* Button listeners */
$("#about-btn").click(function() {
  $("#aboutModal").modal("show");
  return false;
});

$("#full-extent-btn").click(function() {
  map.fitBounds(observations.getBounds());
  return false;
});

$("#list-btn").click(function() {
  $('#sidebar').toggle();
  map.invalidateSize();
  return false;
});

$("#nav-btn").click(function() {
  $(".navbar-collapse").collapse("toggle");
  return false;
});

$("#sidebar-toggle-btn").click(function() {
  $("#sidebar").toggle();
  map.invalidateSize();
  return false;
});

$("#sidebar-hide-btn").click(function() {
  $("#sidebar").hide();
  map.invalidateSize();
});

$(".add-feature-btn").click(function() {
  $("#formModal").modal("show");
  return false;
});

$("#share-btn").click(function() {
  var link = location.protocol + '//' + location.host + location.pathname + "?id=" + activeRecord;
  $("#share-hyperlink").attr("href", link);
  $("#share-twitter").attr("href", "https://twitter.com/intent/tweet?url=" + link + "&text=Another FOSS4G Observation!&via=brymcbride");
  $("#share-facebook").attr("href", "https://facebook.com/sharer.php?u=" + link);
});

$("#contact-form").submit(function() {
  $("<div class='modal-backdrop fade in'></div>").appendTo(document.body);
  $("#loading").show();
  $.ajax({
    url: "https://script.google.com/macros/s/AKfycbyVzUCsCI4FegBJ5TYbBZhS-w2zJYZ_0H5Nro2SRvEdBMy4-H4/exec",
    type: "GET",
    dataType: "json",
    data: {
      first_name: $("#contact-first").val(),
      last_name: $("#contact-last").val(),
      email: $("#contact-email").val(),
      message: $("#contact-message").val(),
      table: "email"
    },
    success: function(data) {
      if (data.status === "success") {
        $("#aboutModal").modal("hide");
        alert("Your message has been sent, thanks for your interest!");
      } else {
        alert("There was an error sending your message. Please try again.");
      }
      $("#contact-form")[0].reset();
      $("#loading").hide();
      $(".modal-backdrop").remove();
    }
  });
  console.log("submitted!");
  return false;
});

/* Hackish form submit to handle modal hiding issues */
$("#data-form").submit(function(e) {
  $("<div class='modal-backdrop fade in'></div>").appendTo(document.body);
  $("#loading").show();
  var photo_url = "";
  var photo_hash = "";

  /* Upload photo anonymously to imgur */
  function postToImgur() {
    var formData = new FormData();
    formData.append("image", $("[name='uploads[]']")[0].files[0]);
    $.ajax({
      url: "https://api.imgur.com/3/image",
      type: "POST",
      datatype: "json",
      data: formData,
      cache: false,
      contentType: false,
      processData: false,
      headers: {
        "Authorization": "Client-ID bbec7a6bb07979a"
      },
      success: function(response) {
        photo_url = response.data.link;
        photo_hash = response.data.deletehash;
        postToCartoDB();
      }
    });
  }

  /* Post data to CartoDB via Google Apps Script proxy (to protect API key) */
  function postToCartoDB() {
    $.ajax({
      url: "https://script.google.com/macros/s/AKfycbyVzUCsCI4FegBJ5TYbBZhS-w2zJYZ_0H5Nro2SRvEdBMy4-H4/exec",
      type: "GET",
      dataType: "json",
      data: {
        longitude: parseFloat($("#longitude").val()),
        latitude: parseFloat($("#latitude").val()),
        date: $("#date").val(),
        observer: $("#observer").val(),
        category: $("#category").val(),
        venue: $("#venue").val(),
        title: $("#title").val(),
        observations: $("#observations").val(),
        photo_url: photo_url,
        photo_hash: photo_hash,
        table: "foss4g_observations"
      },
      success: function(data) {
        addObservation(data.rows[0].cartodb_id);
        $("#data-form")[0].reset();
    }
  });
  }

  /* Hide form */
  $("#formModal").modal("hide");

  /* Post data after form modal is closed */
  $("#formModal").one("hidden.bs.modal", function (e) {
    /* Upload photos first so we have the URL to insert into the DB */
    if ($("[name='uploads[]']")[0].files[0]) {
      postToImgur();
    } else {
      postToCartoDB();
    }
    //$("#formModal").off();
  });
  return false;
});

$("#comment-form").submit(function() {
  $("<div class='modal-backdrop fade in'></div>").appendTo(document.body);
  $("#loading").show();
  $.ajax({
    url: "https://script.google.com/macros/s/AKfycbyVzUCsCI4FegBJ5TYbBZhS-w2zJYZ_0H5Nro2SRvEdBMy4-H4/exec",
    type: "GET",
    dataType: "json",
    data: {
      observation_id: activeRecord,
      name: $("#comment-name").val(),
      email: $("#comment-email").val(),
      comment: $("#comment").val(),
      table: "foss4g_comments"
    },
    success: function(data) {
      fetchComments();
      $("#comment-form")[0].reset();
      $("#loading").hide();
      $(".modal-backdrop").remove();
    }
  });
  return false;
});

function fetchComments() {
  $.ajax({
    cache: false,
    url: "https://fulcrum.cartodb.com/api/v2/sql?format=json&q=SELECT updated_at, name, email, comment FROM foss4g_comments WHERE observation_id = '" + activeRecord + "' ORDER BY updated_at DESC",
    dataType: "json",
    success: function (response) {
      var content = "";
      if (response.rows && response.rows.length > 0) {
        $.each(response.rows, function(index, comment) {
          content +=  "<div class='panel panel-default'>" +
                        "<div class='panel-heading'>" +
                          "<h3 class='panel-title'>" + comment.name + "<span class='text-muted pull-right'><em>" + new Date(comment.updated_at).toLocaleString() + "</em></span></h3>" +
                        "</div>" +
                        "<div class='panel-body'>" +
                          comment.comment +
                        "</div>" +
                      "</div>";
        });
        $("#comment-panes").html(content);
      } else {
        $("#comment-panes").html("<p class='text-muted'><em>No comments</em></p>");
      }
    }
  });
}

function zoomToFeature(id) {
  observations.eachLayer(function (layer) {
    if (layer.feature.properties.id == id) {
      map.setView([layer.getLatLng().lat, layer.getLatLng().lng], 18);
      layer.fire("click");
    }
  });
}

function sidebarClick(id) {
  if (!map.hasLayer(markerClusters)) {
    map.addLayer(markerClusters);
  }
  var layer = observations.getLayer(id);
  map.setView([layer.getLatLng().lat, layer.getLatLng().lng], 17);
  layer.fire("click");
  if (document.body.clientWidth <= 767) {
    $("#sidebar").hide();
    map.invalidateSize();
  }
}

function fetchLookups() {
  /* Load category options from CSV file */
  Papa.parse("lookups/categories.csv", {
    download: true,
    header: true,
    complete: function(results) {
      $.each(results.data, function(index, category) {
        $("#category").append("<option value='"+category.value+"'>"+category.label+"</option>");
      });
    }
  });

  /* Load venue options from CSV file */
  Papa.parse("lookups/venues.csv", {
    download: true,
    header: true,
    complete: function(results) {
      $.each(results.data, function(index, venue) {
        $("#venue").append("<option value='"+venue.value+"'>"+venue.label+"</option>");
      });
    }
  });
}

function addObservation(id) {
  $.ajax({
    url: 'https://fulcrum.cartodb.com/api/v2/sql?format=geojson&q=SELECT the_geom, cartodb_id AS "id", updated_at AS "Timestamp", observer AS "Observer", category AS "Category", venue AS "Venue", title AS "Title", observations AS "Observations", photo_url AS "Photo" FROM foss4g_observations WHERE cartodb_id = '+id,
    dataType: "json",
    success: function (data) {
      observations.addData(data);
      markerClusters.clearLayers();
      markerClusters.addLayer(observations);
    }
  }).done(function() {
    featureList = new List("features", {valueNames: ["feature-name"]});
    featureList.sort("feature-name", {order:"asc"});
    $("#loading").hide();
    $(".modal-backdrop").remove();
  });
}

function photoGallery(photos) {
  var photoArray = [];
  $.each(photos.split(","), function(index, photo) {
    photoArray.push({href: photo});
  });
  $.fancybox(photoArray, {
    "type": "image",
    "showNavArrows": true,
    "padding": 0,
    "scrolling": "no",
    beforeShow: function () {
      this.title = "Photo " + (this.index + 1) + " of " + this.group.length + (this.title ? " - " + this.title : "");
    }
  });
  return false;
}

function loadObservations() {
  $.ajax({
    cache: false,
    url: 'https://fulcrum.cartodb.com/api/v2/sql?format=geojson&q=SELECT the_geom, cartodb_id AS "id", updated_at AS "Timestamp", observer AS "Observer", category AS "Category", venue AS "Venue", title AS "Title", observations AS "Observations", photo_url AS "Photo" FROM foss4g_observations',
    dataType: "json",
    success: function (data) {
      observations.addData(data);
      markerClusters.addLayer(observations);
    }
  }).done(function() {
    featureList = new List("features", {valueNames: ["feature-name"]});
    featureList.sort("feature-name", {order:"asc"});
    $("#loading").hide();
    /* If id param passed in URL, zoom to feature, else fit to cluster bounds */
    if (urlParams.id && urlParams.id.length > 0) {
      zoomToFeature(urlParams.id);
    } else {
      map.fitBounds(markerClusters.getBounds());
    }
  });
}

map = L.map("map", {
  layers: [mapboxOSM, markerClusters, highlight],
  zoomControl: false
}).fitWorld();

/* Bare bones attribution */
map.attributionControl.setPrefix("");

/* Clear feature highlight when map is clicked */
map.on("click", function(e) {
  highlight.clearLayers();
});

/* Change form map when main map is changed */
map.on("baselayerchange", function(e) {
  if (e.name === "Aerial Imagery") {
    map2.removeLayer(mapboxOSM2).addLayer(mapboxSat2);
  } else if (e.name === "Street Map") {
    map2.removeLayer(mapboxSat2).addLayer(mapboxOSM2);
  }
});

/* Larger screens get expanded layer control */
if (document.body.clientWidth <= 767) {
  var isCollapsed = true;
} else {
  var isCollapsed = false;
}

var baseLayers = {
  "Street Map": mapboxOSM,
  "Aerial Imagery": mapboxSat
};

var overlayLayers = {
  "Observations": markerClusters
};

var layerControl = L.control.layers(baseLayers, overlayLayers, {
  collapsed: isCollapsed
}).addTo(map);

var zoomControl = L.control.zoom({
  position: "bottomright"
}).addTo(map);

var locateControl = L.control.locate({
  position: "bottomright",
  drawCircle: true,
  follow: true,
  setView: true,
  keepCurrentZoomLevel: true,
  markerStyle: {
    weight: 1,
    opacity: 0.8,
    fillOpacity: 0.8
  },
  circleStyle: {
    weight: 1,
    clickable: false
  },
  icon: "icon-direction",
  metric: false,
  strings: {
    title: "My location",
    popup: "You are within {distance} {unit} from this point",
    outsideMapBoundsMsg: "You seem located outside the boundaries of the map"
  },
  locateOptions: {
    maxZoom: 18,
    watch: true,
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 10000
  }
}).addTo(map);

var mapboxOSM2 = L.tileLayer("http://{s}.tiles.mapbox.com/v3/spatialnetworks.map-6l9yntw9/{z}/{x}/{y}.jpg70", {
  maxZoom: 19,
  subdomains: ["a", "b", "c", "d"],
  attribution: 'Basemap <a href="https://www.mapbox.com/about/maps/" target="_blank">© Mapbox © OpenStreetMap</a>'
});
var mapboxSat2 = L.tileLayer("http://{s}.tiles.mapbox.com/v3/spatialnetworks.map-xkumo5oi/{z}/{x}/{y}.jpg70", {
  maxZoom: 19,
  subdomains: ["a", "b", "c", "d"],
  attribution: 'Basemap <a href="https://www.mapbox.com/about/maps/" target="_blank">© Mapbox © OpenStreetMap</a>'
});

map2 = L.map("map2", {
  layers: [mapboxOSM2],
  attributionControl: false,
  zoomControl: false
}).fitWorld();

var baseLayers2 = {
  "Street Map": mapboxOSM2,
  "Aerial Imagery": mapboxSat2
};

var layerControl2 = L.control.layers(baseLayers2, null, {
  collapsed: true
}).addTo(map2);

var locateControl2 = L.control.locate({
  position: "topleft",
  drawCircle: true,
  follow: true,
  setView: true,
  keepCurrentZoomLevel: false,
  markerStyle: {
    weight: 1,
    opacity: 0.8,
    fillOpacity: 0.8
  },
  circleStyle: {
    weight: 1,
    clickable: false
  },
  icon: "icon-direction",
  metric: false,
  strings: {
    title: "My location",
    popup: "You are within {distance} {unit} from this point",
    outsideMapBoundsMsg: "You seem located outside the boundaries of the map"
  },
  locateOptions: {
    maxZoom: 18,
    watch: true,
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 10000
  }
}).addTo(map2);

map2.on("startfollowing", function() {
  map2.on("dragstart", locateControl2.stopFollowing);
}).on("stopfollowing", function() {
  map2.off("dragstart", locateControl2.stopFollowing);
});

map2.on("moveend", function(e) {
  $("#latitude").val(map2.getCenter().lat.toFixed(6));
  $("#longitude").val(map2.getCenter().lng.toFixed(6));
});

$("#formModal").on("shown.bs.modal", function (e) {
  if (locateControl._active) {
    gpsActive = true;
    locateControl.stopLocate();
  } else {
    gpsActive = false;
  }
  map2.invalidateSize();
  map2.fitBounds(map.getBounds());
  locateControl2.locate();
}).on("hidden.bs.modal", function (e) {
  locateControl2.stopLocate();
  if (gpsActive) {
    locateControl.locate();
  }
});
