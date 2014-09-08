foss4g-observations
===================

FOSS4G Observations is a simple, open source, responsive web application for collecting and displaying crowdsourced observations from the [2014 FOSS4G Conference](https://2014.foss4g.org/) in Portland, OR.

### Demo:
http://bmcbride.github.io/foss4g-observations

### Features:
* Fullscreen mobile-friendly [Leaflet](http://leafletjs.com/) map with navbar, sidebar, and modal placeholders
* Uses the popular [Bootstrap](http://getbootstrap.com/) framework for modern, responsive design
* Responsive sidebar feature list with sorting and filtering via [List.js](http://listjs.com/)
* HTML5 form attributes and validation, with extended browser support via [webshim](http://afarkas.github.io/webshim/demos/)
* Select lists populated by simple CSV files via the [Papa Parse](http://papaparse.com/) JavaScript utility
* HTML5 geolocation with GPS "high accuracy" and following enabled
* Post new observations, comment on existing posts, share via link, Twitter, Facebook
* Uses free web services- data posted to [CartoDB](http://cartodb.com/), images uploaded to [Imgur](http://imgur.com/)
* Simple Google Apps Script to proxy AJAX requests, protect API keys, send email
* Crowdsourced data available for download as GeoJSON, CSV, KML, Shapefile
