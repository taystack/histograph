var histograph = angular.module("Histograph", ['ngRoute']);

// app.config(function($routeProvider, $locationProvider) {
//   $routeProvider
//   .when('/', {
//     templateUrl: "tab.html",
//     controller:'MainCtrl',
//   });
  // .when('/about/', {
  //   templateUrl: "templates/about.html",
  //   controller: 'aboutController',
  // })
  // .otherwise({
  //   template: 'does not exists'
  // });
// });

histograph.controller("MainCtrl", function($scope, $timeout) {

  // Build the history object
  $scope.data = {
    hashes: Array(),
    visitTotal: 0,
    lookupId: {},
    lookupUrl: {},
    lookupParent: {},
    place: 0
  };

  var tmpColorsCompliment = {
    "#0A268A": { // blue
      place: 0,
      items: [
        "#3352C2", // blue
        "#0D31B4",
        "#091E6B",
        "#08164D"
      ]
    },
    "#CC8E00": { // yellow
      place: 0,
      items: [
        "#FFBE2A", // oj
        "#FFB100",
        "#9E6E00",
        "#714F00"
      ]
    },
    "#B70034": { // maroon
      place: 0,
      items: [
        "#EC275F", // maroon
        "#E80042",
        "#8E0029",
        "#66001D"
      ]
    },
    "#4EB500": { // green
      place: 0,
      items: [
        "#7BE926", // green
        "#63E500",
        "#3D8C00",
        "#2C6400"
      ]
    },
    "#CCC900": { // yellow
      place: 0,
      items: [
        "#FFFC2A", // yellow
        "#FFFC00",
        "#9E9C00",
        "#717000"
      ]
    },
    "#008A56": { // green
      place: 0,
      items: [
        "#20C184", // green
        "#00B470",
        "#006B42",
        "#004C30"
      ]
    },
    "#CC3F00": { // red/oj
      place: 0,
      items: [
        "#FF6C2A", // red/oj
        "#FF4F00",
        "#9E3100",
        "#712300"
      ]
    },
    "#550588": { // purple
      place: 0,
      items: [
        "#8529C0", // purple
        "#6F06B2",
        "#42046A",
        "#30044C"
      ]
    }
  };

  var tmpColors = ["#0A268A", "#CC8E00", "#B70034", "#4EB500", "#CCC900", "#008A56", "#CC3F00", "#550588"];

  var getColor = function() {
    if ($scope.data.place === tmpColors.length) {
      $scope.data.place = 0;
    }
    var color = tmpColors[$scope.data.place];
    $scope.data.place += 1;
    return color;
  }
  var getCompliment = function(color) {
    if (tmpColorsCompliment[color].place === tmpColorsCompliment[color].items.length) {
      tmpColorsCompliment[color].place = 0;
    }
    var clr = tmpColorsCompliment[color].items[tmpColorsCompliment[color].place];
    tmpColorsCompliment[color].place += 1;
    return clr;
  }

  var getHostname = function(url) {
    var tmp = document.createElement("a")
    tmp.href = url;
    return tmp.hostname;
  }

  var buildGraphData = function() {

    for (var x = 0; x < Object.keys($scope.data.items).length; x++) {
      var name = getHostname($scope.data.items[x].url)
      if ($scope.data.lookupUrl[name]) {

        // Append the item to the new entry's items list.
        $scope.data.lookupUrl[name].items[$scope.data.items[x].id] = $scope.data.items[x];
        // $scope.data.hashes[name].items[$scope.data.items[x].id] = $scope.data.items[x];

        // Generate the lookup parent by id. => $scope.data.lookupParent[id] = hist obj
        $scope.data.lookupParent[$scope.data.items[x].id] = $scope.data.lookupUrl[name];

        // Sum the parent's visitCount with the child's visitCount.
        $scope.data.lookupUrl[name].visitCount += $scope.data.items[x].visitCount;
      } else {

        // Create the parent entry for this uri.
        // Set the parent's color.
        // Set the parent's visitCount to the child's visitCount.
        var obj = {
          color: getColor(),
          name: name,
          items: [$scope.data.items[x]],
          visitCount: $scope.data.items[x].visitCount,
          lastVisitTime: $scope.data.items[x].lastVisitTime
        }

        $scope.data.hashes.push(obj);

        // Generate the lookup by id. => $scope.data.lookup[id] = hist obj
        $scope.data.lookupId[$scope.data.items[x].id] = $scope.data.items[x];

        // Generate the lookup parent by id. => $scope.data.lookupParent[id] = hist obj
        $scope.data.lookupParent[$scope.data.items[x].id] = obj;

        // Generate the lookup by url. => $scope.data.lookup[url] = hist obj
        $scope.data.lookupUrl[name] = obj;
      }
    }
    for (var x = 0; x < Object.keys($scope.data.hashes).length; x++) {
      $scope.data.visitTotal += $scope.data.hashes[Object.keys($scope.data.hashes)[x]].visitCount;
    }
  }

  var buildGraph = function() {

    var innerWidth = 600,
        innerHeight = 600,
        innerRadius = Math.min(innerWidth, innerHeight) / 2;
        outerWidth = 600,
        outerHeight = 600,
        outerRadius = Math.min(innerWidth, innerHeight) / 2;

    var innerPie = d3.layout.pie()
      .value(function(val) {
        return val.visitCount;
      })
      .startAngle(1.1*Math.PI)
      .endAngle(3.1*Math.PI)
      .sort(function(a, b) {
        var lookA = a.lastVisitTime;
        var lookB = b.lastVisitTime;
        return lookB < lookA ? -1 : lookB > lookA ? 1 : lookB >= lookA ? 0 : NaN;
      });

    var outerPie = d3.layout.pie()
      .value(function(val) {
        return val.visitCount;
      })
      .startAngle(1.1*Math.PI)
      .endAngle(3.1*Math.PI)
      .sort(function(a, b) {
        var lookA = $scope.data.lookupParent[a.id].lastVisitTime;
        var lookB = $scope.data.lookupParent[b.id].lastVisitTime;
        return lookB < lookA ? -1 : lookB > lookA ? 1 : lookB >= lookA ? 0 : NaN;
      });

    var innerArc = d3.svg.arc()
      .innerRadius(innerRadius - 180)
      .outerRadius(innerRadius - 140);

    var outerArc = d3.svg.arc()
      .innerRadius(outerRadius - 140)
      .outerRadius(outerRadius - 100);

    var innerSvg = d3.select("#histograph").append("svg")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .append("g")
      .attr("transform", "translate(" + innerWidth / 2 + "," + innerHeight / 2 + ")");

    var outerSvg = d3.select("#histograph").append("svg")
      .attr("width", outerWidth)
      .attr("height", outerHeight)
      .append("g")
      .attr("transform", "translate(" + outerWidth / 2 + "," + outerHeight / 2 + ")");

    var innerPath = innerSvg.selectAll("path")
      .data(innerPie($scope.data.hashes))
      .enter().append("path")
      .attr("class", function(d) {return d.data.name;})
      .attr("fill", function(d) {return d.data.color;})
      .transition().delay(function(d, i) { return i * 100; }).duration(1000)
      .attrTween('d', function(d) {
        var i = d3.interpolate(d.startAngle+0.1, d.endAngle);
        return function(t) {
          d.endAngle = i(t);
          return innerArc(d);
        }
      });

    var outerPath = outerSvg.selectAll("path")
      .data(outerPie($scope.data.items))
      .enter().append("path")
      .attr("class", function(d) {return getHostname(d.data.url);})
      .attr("fill", function(d) {return getCompliment($scope.data.lookupUrl[getHostname(d.data.url)].color);})
      .transition().delay(function(d, i) { return i * 20; }).duration(1000)
      .attrTween('d', function(d) {
        var i = d3.interpolate(d.startAngle+0.1, d.endAngle);
        return function(t) {
          d.endAngle = i(t);
          return outerArc(d);
        }
      });
  }

  $scope.handleClick = function(event) {
    console.warn(event.target.attributes["class"], " Event handler not implemented yet!");
  }

  $scope.getHostname = function(url) {return getHostname(url);}

  // Set the browser history on the scope object.
  var setHistograph = function() {
    d3.select("svg").remove();
    chrome.history.search({"text": ""}, function(items) {
      $scope.data.items = items;
      $scope.data.hashes = [];
      buildGraphData();
      buildGraph();
      $timeout($scope.$apply, 4000);
    });
  }

  setHistograph();
});
