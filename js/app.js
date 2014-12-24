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

  var tmpColorsCompliment = {
    "#7E006F": { // purple
      place: 0,
      items: [
        "#BF00A8",
        "#990086",
        "#620056",
        "#410039",
      ]
    },
    "#B60500": { // red
      place: 0,
      items: [
        "#FF0700",
        "#DC0600",
        "#8E0400",
        "#5D0200",
      ]
    },
    "#015971": { // teal
      place: 0,
      items: [
        "#048BB1",
        "#026B89",
        "#014558",
        "#002D3A",
      ]
    },
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

  // Build the history object
  $scope.data = {
    hashes: Array(),
    visitTotal: 0,
    hostnames: {},
    preparedData: {},
    place: 0
  };

  $scope.toggle = {};

  $scope.toggleParent = {};

  $scope.toggleAll = function() {
    for (var key in $scope.toggle) $scope.toggle[key] = true;
  };

  $scope.calculatePercentage = function(size) {
    return (size / $scope.data.visitTotal) * 100;
  }

  $scope.handleMouseOver = function(data) {
    if (!data.id_) return;
    console.log("data.id_", data.id_);
    if (data.id_ === "host") {
      d3.select("[data-host='" + data.name + "']").classed("hover", true);
    } else {
      d3.select("#" + data.id_).classed("hover", true);
    }
    var event = d3.event;
    $scope.hoverUrl = data.name;
    $scope.hoverVisits = data.size;
    $scope.hoverPercent = $scope.calculatePercentage(data.size);
    $scope.$apply();
    d3.select(".tooltip-container").attr(
      "style",
        "left: " + (event.screenX + 20) + "px;" +
        "top: " + (event.screenY - 60) + "px;" +
        "opacity: 1; z-index: 100");
  };

  $scope.handleMouseOut = function(data) {
    if (!data.id_) return;
    if (data.id_ === "host") {
      d3.select("[data-host='" + data.name + "']").classed("hover", false);
    } else {
      d3.select("#" + data.id_).classed("hover", false);
    }
    d3.select(".tooltip-container").attr(
      "style",
        "left: " + event.screenX + "px;" +
        "top: " + (event.screenY - 60) + "px;" +
        "opacity: 0; z-index: -1");
  };

  var getHostname = function(url) {
    var tmp = document.createElement("a");
    tmp.href = url;
    return tmp.hostname;
  }

  var buildGraphData = function() {

    var trimStr = function(str) {
      var len = 45;
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

      // Set the hostname on the hostname hash.
      if (!$scope.data.hostnames[host]) {
        $scope.data.hostnames[host] = {
          name: host,
          url: host,
          size: $scope.data.items[item].visitCount,
          children: {},
          color: getColor(),
          id_: "host"
        };
      } else {
        $scope.data.hostnames[host].size += $scope.data.items[item].visitCount;
      }

      // Check to see if this is a query
      if ($scope.data.items[item].url.split("?").length > 1) {
        var spName = $scope.data.items[item].url.split(host)[1].split("?");
        if (!$scope.data.hostnames[host].children[spName[0]]) {
          var qObj = {
            children: [],
            color: getCompliment($scope.data.hostnames[host].color),
            name: spName[0],
            size: $scope.data.items[item].visitCount,
            url: spName[0],
            id_: "search"
          };
          // Set the actual history piece here above the query.
          qObj.children.push({
            color: getCompliment($scope.data.hostnames[host].color),
            id_: "id-" + $scope.data.items[item].id,
            name: trimStr("?" + spName[1]),
            size: $scope.data.items[item].visitCount,
            url: "?" + $scope.data.items[item].url
          })
          // Set the query obj on the host.
          $scope.data.hostnames[host].children[qObj.name] = qObj;
        } else {
          // Update the size of this piece.
          $scope.data.hostnames[host].children[spName[0]].size += $scope.data.items[item].visitCount;
          $scope.data.hostnames[host].children[spName[0]].children.push({
            color: getCompliment($scope.data.hostnames[host].color),
            id_: "id-" + $scope.data.items[item].id,
            name: trimStr("?" + spName[1]),
            size: $scope.data.items[item].visitCount,
            url: "?" + $scope.data.items[item].url
          })
        }
      } else { // It's not a query.
        $scope.data.hostnames[host].children["id-" + $scope.data.items[item].id] = {
          color: getCompliment($scope.data.hostnames[host].color),
          name: trimStr($scope.data.items[item].url),
          size: $scope.data.items[item].visitCount,
          url: $scope.data.items[item].url,
          id_: "id-" + $scope.data.items[item].id
        }
        // Update the size of the host.
      }
    }

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
      var obj = {
        name: item,
        url: item,
        children: [],
        size: root[item].size,
        color: root[item].color,
        id_: root[item].id_
      };
      if (root[item].children) {
        for (var subItem in root[item].children) {
          obj.children.push(root[item].children[subItem]);
        }
      }
      $scope.data.preparedData.children.push(obj)
    }
    // debugger;

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
        width = 500,
        height = 600,
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
          .attr("data-id", function(d) {return d.id_ || d.name})
          .attr("class", "starburst")
          .attr("d", arc)
          .style("fill", function(d) { return d.color; })
          .on("mouseover", $scope.handleMouseOver)
          .on("mouseleave", $scope.handleMouseOut)
          .on("click", click);

      function click(d) {
        var item = document.querySelector("[data-host='" + d3.event.target.id +"']")
        $scope.toggle[d.name] = false;
        if (d.name === "Histograph") {$scope.toggleAll();}
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
