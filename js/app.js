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
    hostnames: {},
    preparedData: {},
    place: 0
  };

  $scope.toggle = {};

  $scope.toggleAll = function() {
    for (var key in $scope.toggle) $scope.toggle[key] = true;
  };

  $scope.calculatePercentage = function(size) {
    // x/100 == size/$scope.data.visitTotal
    return (size / $scope.data.visitTotal) * 100;
  }

  $scope.handleMouseOver = function(data) {
    var event = d3.event;
    $scope.hoverUrl = data.url;
    $scope.hoverVisits = data.size;
    $scope.hoverPercent = $scope.calculatePercentage(data.size);
    $scope.$apply();
    d3.select(".tooltip-container").attr(
      "style",
        "left: " + event.screenX + "px;" +
        "top: " + (event.screenY - 60) + "px;" +
        "opacity: 1");
  };

  $scope.handleMouseOut = function() {
    d3.select(".tooltip-container").attr(
      "style",
        "left: " + event.screenX + "px;" +
        "top: " + (event.screenY - 60) + "px;" +
        "opacity: 0");
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
    var tmp = document.createElement("a");
    tmp.href = url;
    return tmp.hostname;
  }

  var buildGraphData = function() {

    var trimStr = function(str) {
      var len = 25;
      if (str.length > len) {
        return str.substring(0, len) + "…";
      } else { return str; }
    }

    // Build out the hostnames. This is the base set of data. Each history item
    // is also a child of it's host.
    for (var item in $scope.data.items) {
      $scope.data.visitTotal += $scope.data.items[item].visitCount;
      var host = getHostname($scope.data.items[item].url),
          name;
      if ($scope.data.items[item].title) {
        name = trimStr($scope.data.items[item].title);
      } else {
        name = trimStr($scope.data.items[item].url.split(host)[1]);
      }
      var obj = {
        name: name,
        size: $scope.data.items[item].visitCount,
        url: $scope.data.items[item].url
      }
      if ($scope.data.hostnames[host]) {
        obj.color = getCompliment($scope.data.hostnames[host].color)
        $scope.data.hostnames[host].size += obj.size;
        $scope.data.hostnames[host].children.push(obj);
      } else {
        var parent = {
          name: host,
          url: host,
          size: obj.size,
          children: [],
          color: getColor()
        }
        $scope.toggle[host] = true;
        obj.color = getCompliment(parent.color);
        parent.children.push(obj);
        $scope.data.hostnames[host] = parent;
      }
    }

    // $scope.$apply();

    // Now build the d3 consumable data.
    $scope.data.preparedData = {
      name: "Histograph",
      children: [],
      color: "transparent",
      url: "Histograph",
      size: $scope.data.visitTotal
    };
    var root = $scope.data.hostnames;
    for (var item in root) {
      $scope.data.preparedData.children.push({
        name: item,
        url: item,
        children: root[item].children,
        size: root[item].size,
        color: root[item].color
      });
    }

    $scope.$apply();
  }

  var buildCircleTree = function() {
    var diameter = 1200;

    var tree = d3.layout.tree()
        .size([360, diameter / 2 - 320])
        .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

    var diagonal = d3.svg.diagonal.radial()
        .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });

    var svg = d3.select("#histo-circle-tree").append("svg")
        .attr("width", diameter)
        .attr("height", diameter - 150)
      .append("g")
        .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

    // Set the root node in the circular tree.
    var root = $scope.data.preparedData;

    // debugger;

    var nodes = tree.nodes(root),
        links = tree.links(nodes);

    var link = svg.selectAll(".link")
        .data(links)
      .enter().append("path")
        .attr("class", "link")
        .attr("stroke", function(d) {return d.target.color})
        .attr("d", diagonal);

    var node = svg.selectAll(".node")
        .data(nodes)
      .enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })

    node.append("circle")
        .attr("r", 4.5);

    node.append("text")
        .attr("dy", ".31em")
        .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
        .attr("transform", function(d) { return d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)"; })
        .text(function(d) { return d.name; });

    d3.select(self.frameElement).style("height", diameter - 150 + "px");

  }

  var buildTree = function() {
    var m = [20, 120, 20, 120],
        w = 1280 - m[1] - m[3],
        h = 800 - m[0] - m[2],
        i = 0,
        root;

    var tree = d3.layout.tree()
      .size([h, w]);

    var diagonal = d3.svg.diagonal()
        .projection(function(d) { return [d.y, d.x]; });

    var vis = d3.select("#histograph").append("svg:svg")
        .attr("width", w + m[1] + m[3])
        .attr("height", h + m[0] + m[2])
      .append("svg:g")
        .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

    root = $scope.data.preparedData;
    root.x0 = h / 2;
    root.y0 = 0;

    function toggleAll(d) {
      if (d.children) {
        d.children.forEach(toggleAll);
        toggle(d);
      }
    }

    // Initialize the display to show a few nodes.
    root.children.forEach(toggleAll);

    update(root);

    function update(source) {
      var duration = d3.event && d3.event.altKey ? 5000 : 500;

      // Compute the new tree layout.
      var nodes = tree.nodes(root).reverse();

      // Normalize for fixed-depth.
      nodes.forEach(function(d) { d.y = d.depth * 180; });

      // Update the nodes…
      var node = vis.selectAll("g.node")
          .data(nodes, function(d) { return d.id || (d.id = ++i); });

      // Enter any new nodes at the parent's previous position.
      var nodeEnter = node.enter().append("svg:g")
          .attr("class", "node")
          .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
          .on("click", function(d) { toggle(d); update(d); });

      nodeEnter.append("svg:circle")
          .attr("r", 1e-6)
          .style("fill", function(d) { return d.color });

      nodeEnter.append("svg:text")
          .attr("x", function(d) { return d.children ? -10 : 10; })
          .attr("dy", ".35em")
          .attr("text-anchor", function(d) { return d.children ? "end" : "start"; })
          .text(function(d) { return d.name; })
          .style("fill-opacity", 1e-6);

      // Transition nodes to their new position.
      var nodeUpdate = node.transition()
          .duration(duration)
          .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

      nodeUpdate.select("circle")
          .attr("r", 4.5)
          .style("fill", function(d) { return d.color });

      nodeUpdate.select("text")
          .style("fill-opacity", 1);

      // Transition exiting nodes to the parent's new position.
      var nodeExit = node.exit().transition()
          .duration(duration)
          .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
          .remove();

      nodeExit.select("circle")
          .attr("r", 1e-6)

      nodeExit.select("text")
          .style("fill-opacity", 1e-6);

      // Update the links…
      var link = vis.selectAll("path.link")
          .data(tree.links(nodes), function(d) { return d.target.id; });

      // Enter any new links at the parent's previous position.
      link.enter().insert("svg:path", "g")
          .attr("class", "link")
          .attr("stroke", function(d) {return d.target.color})
          .attr("d", function(d) {
            var o = {x: source.x0, y: source.y0};
            return diagonal({source: o, target: o});
          })
        .transition()
          .duration(duration)
          .attr("d", diagonal);

      // Transition links to their new position.
      link.transition()
          .duration(duration)
          .attr("d", diagonal);

      // Transition exiting nodes to the parent's new position.
      link.exit().transition()
          .duration(duration)
          .attr("d", function(d) {
            var o = {x: source.x, y: source.y};
            return diagonal({source: o, target: o});
          })
          .remove();

      // Stash the old positions for transition.
      nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    // Toggle children.
    function toggle(d) {
      if (d.children) {
        // d._children = d.children;
        // d.children = null;
      } else {
        // d.children = d._children;
        // d._children = null;
      }
    }

  }

  var buildGraph = function() {
    var cirPad = 2,
        width = 400,
        height = 500,
        radius = Math.min(width, height) / 2;

    var x = d3.scale.linear()
        .range([0, 2 * Math.PI]);

    var y = d3.scale.sqrt()
        .range([0, radius]);

    // var color = d3.scale.category20c();

    var svg = d3.select("#histograph").append("svg")
        .attr("width", width)
        .attr("height", height)
      .append("g")
        .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

    var partition = d3.layout.partition()
        .value(function(d) { return d.size; });

    var arc = d3.svg.arc()
        .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
        .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
        .innerRadius(function(d) { return Math.max(0, y(d.y)); })
        .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

    chrome.history.search({"text": ""}, function(items) {
      $scope.data.items = items;
      buildGraphData();
      // buildTree();
      buildCircleTree();

      var path = svg.selectAll("path")
          .data(partition.nodes($scope.data.preparedData))
        .enter().append("path")
          .attr("id", function(d) {return d.name})
          .attr("d", arc)
          .style("fill", function(d) { return d.color; })
          .on("mouseover", $scope.handleMouseOver)
          .on("mouseleave", $scope.handleMouseOut)
          .on("click", click);

      function click(d) {
        var item = document.querySelector("[data-host='" + d3.event.target.id +"']")
        item ? item.click() : $scope.toggleAll();
        path.transition()
          .duration(750)
          .attrTween("d", arcTween(d));
      }

      $scope.$apply();

    });

    d3.select(self.frameElement).style("height", height + "px");

    // Interpolate the scales!
    function arcTween(d) {
      var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
          yd = d3.interpolate(y.domain(), [d.y, 1]),
          yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
      return function(d, i) {
        return i
            ? function(t) { return arc(d); }
            : function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
      };
    }
  }

  $scope.handleClick = function(event) {
    var name = event.currentTarget.attributes["data-host"].value;
    $scope.toggle[name] = !$scope.toggle[name];
    // var item = document.querySelector("#" + name);
    // console.log("item", item);
    // item.on("click")();
  }

  $scope.handleWheelClick = function(name) {


    $scope.toggle[name] = !$scope.toggle[name];
    // Apply the change since this wasn't part of Angular's binding scheme.
    $scope.$apply();
  }

  $scope.getHostname = function(url) {return getHostname(url);}

  buildGraph();
});
