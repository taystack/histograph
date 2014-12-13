angular.module("Histograph", [])
.controller("MainCtrl", function($scope, $timeout) {

  // Build the history object
  $scope.data = {colors: Array()};

  function hashCode(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
       hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return "#" + intToARGB(hash);
  }

  function intToARGB(i){
      return ((i>>24)&0xFF).toString(16) +
             ((i>>16)&0xFF).toString(16) +
             ((i>>8)&0xFF).toString(16) +
             (i&0xFF).toString(16);
  }

  var getHostname = function(url) {
    var tmp = document.createElement("a")
    tmp.href = url;
    if (!$scope.data.colors[tmp.hostname]) {
      $scope.data.colors[tmp.hostname] = hashCode(tmp.hostname);
    }
    return tmp.hostname;
  }

  var getColor = function(name) {
    return $scope.data.colors[name];
  }

  var buildGraph = function() {

    var width = 400,
        height = 400,
        radius = Math.min(width, height) / 2;

    var colors = d3.scale.ordinal().range($scope.data.items.map(
      function(val) {
        return $scope.data.colors[getHostname(val.url)];
      }));

    var pie = d3.layout.pie()
      .value(function(val) {return val.id})
      .sort(function(a, b) {
        return getHostname(b) < getHostname(a) ? -1 : getHostname(b) > getHostname(a) ? 1 : getHostname(b) >= getHostname(a) ? 0 : NaN;
      });

    var arc = d3.svg.arc()
      .innerRadius(radius - 100)
      .outerRadius(radius - 50);

    var svg = d3.select("#histograph").append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var path = svg.selectAll("path")
      .data(pie($scope.data.items))
      .enter().append("path")
      .attr("fill", function(d, i) {
        console.log("$scope.data.colors[" + getHostname(d.data.url)+ "]", $scope.data.colors[getHostname(d.data.url)].slice(0, 7));
        return $scope.data.colors[getHostname(d.data.url)].slice(0, 7);
      })
      .attr("d", arc);

  }

  // Set the browser history on the scope object.
  var setHistograph = function() {
    chrome.history.search({"text": ""}, function(items) {
      $scope.data.items = items;
      buildGraph();
      console.log("$scope.data.colors", Object.keys($scope.data.colors).length);
      $timeout();
    });
  }

  setHistograph();
});

// [#BD4F0E,
// #F49156,
// #E46E28,
// #9B3A00,
// #722A00,

// #BD7A0E,
// #F4B856,
// #E49D28,
// #9B6000,
// #724600,

// #13417C,
// #416BA0,
// #255696,
// #083166,
// #04234B,

// #097B5F,
// #389F85,
// #1A9576,
// #00654C,
// #004A37]
