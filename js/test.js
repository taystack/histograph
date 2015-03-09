var histograph = angular.module('Histograph', []);

function hashCode(str) { // java String#hashCode
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
       hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

function intToARGB(i){
    return ((i>>24)&0xFF).toString(16) +
           ((i>>16)&0xFF).toString(16) +
           ((i>>8)&0xFF).toString(16) +
           (i&0xFF).toString(16);
}

function getColor(name) {
  return intToARGB(hashCode(name));
}

function trimStr(str) {
  var len = 45;
  if (str.length > len) {
    return str.substring(0, len) + "…";
  } else { return str; }
}

function parseQuery(qStr) {
  var q = qStr.split("?")[1];
  var query = {
    size: 1
  };
  // Is this a strange google query hash param?
  if (q.split("#").length > 1) {
    var gq = q.split("#")[1];
    query[gq.split("=")[0]] = decodeURI(gq.split("=")[1]) || "BASE URL";
    q = q.split("#")[0];
  }
  _.each(q.split("&"), function(param) {
    var sides = param.split("=");
    this[0][sides[0]] = decodeURI(sides[1]);
  }, [query])
  return query;
}

histograph.controller("MainCtrl", function($scope) {
  $scope.data = {
    search: "",
    visitTotal: 0,
    tableData: {},
    hostnames: {}
  };
  $scope.toggle = {};

  // use: $scope.getHistory.then(function(items) {...})
  $scope.getHistory = function(text) {
    var txt = text || "";
    var history = new Promise(function(resolve, reject) {
      chrome.history.search({"text": txt, "maxResults": 10000}, function(items) {
        $scope.data.items = items;
        $scope.rawItems = _.clone(items);
        resolve(items);
      })
    });
    return history;
  }

  $scope.getVisits = function(item) {
    var visits = new Promise(function(resolve, reject) {
      chrome.history.getVisits({url: item.url}, function(VisitItems) {
        resolve(VisitItems)
      })
    });
    return visits;
  }

  $scope.getHostname = function(url) {
    // return url.split("://")[1].split("/")[0];
    var l = document.createElement("a");
    l.href = url;
    return l.hostname;
  };

  $scope.prepareData = function() {
    // Build out the hostnames. This is the base set of data. Each history item
    // is also a child of it's host.
    for (var item in $scope.data.items) {
      $scope.data.visitTotal += $scope.data.items[item].visitCount;

      var host = $scope.getHostname($scope.data.items[item].url),
          name;

      // Set the hostname on the hostname hash.
      if (!$scope.data.hostnames[host]) {
        $scope.data.hostnames[host] = {
          name: host,
          url: host,
          size: $scope.data.items[item].visitCount,
          children: {},
          color: getColor(host),
          id_: host,
          type: "host"
        };
        $scope.toggle[host] = true;
      } else {
        $scope.data.hostnames[host].size += $scope.data.items[item].visitCount;
      }

      // Check to see if this is a query
      if ($scope.data.items[item].url.split("?").length > 1) {
        var spName = $scope.data.items[item].url.split(host)[1].split("?");
        if (!$scope.data.hostnames[host].children[spName[0]]) {
          // It is a query of sorts...
          var qObj = {
            children: [],
            color: '#ddd',
            name: spName[0],
            size: $scope.data.items[item].visitCount,
            url: spName[0],
            id_: spName[0],
            type: "serach"
          };
          // Set the actual history piece here above the query.
          qObj.children.push({
            color: '#ddd',
            id_: "id-" + $scope.data.items[item].id,
            name: trimStr("?" + spName[1]),
            size: $scope.data.items[item].visitCount,
            url: "?" + $scope.data.items[item].url,
            children: [parseQuery($scope.data.items[item].url)]
          })
          // Set the query obj on the host.
          $scope.data.hostnames[host].children[qObj.name] = qObj;
        } else {
          // Update the size of this piece.
          $scope.data.hostnames[host].children[spName[0]].size += $scope.data.items[item].visitCount;
          $scope.data.hostnames[host].children[spName[0]].children.push({
            color: '#ddd',
            id_: "id-" + $scope.data.items[item].id,
            name: trimStr("?" + spName[1]),
            size: $scope.data.items[item].visitCount,
            url: "?" + $scope.data.items[item].url
          })
        }
      } else { // It's not a query.
        $scope.data.hostnames[host].children["id-" + $scope.data.items[item].id] = {
          color: '#ddd',
          name: trimStr($scope.data.items[item].url.split(host)[1]),
          size: $scope.data.items[item].visitCount,
          url: $scope.data.items[item].url.split(host)[1],
          id_: "id-" + $scope.data.items[item].id
        }
      }
    }
  }

  $('#histo-search').on('keyup', function(e) {
    $('.histo-item').addClass('loading');
    $scope.zilch = false;
    $scope.getHistory($(this).val()).then(function(items) {
      if (!items.length) {
        $scope.getHistory().then(function(newbies) {
          $scope.data.items = newbies;
          $scope.$apply();
          $scope.prepareData();
          $scope.buildSunburst();
          // $scope.buildPieUpdate()
          $scope.zilch = true;
          $('.histo-item').removeClass('loading');
        })
      } else {
        $scope.data.items = items;
        $scope.$apply();
        $scope.prepareData();
        // $scope.buildPieUpdate();
        $scope.buildSunburst();
        $('.histo-item').removeClass('loading');
      }
    })
  })

  $scope.prepareFlare = function() {
    $scope.flare = {
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
      $scope.flare.children.push(obj)
    }
    $scope.$digest();
  }

  $scope.saveSnapshot = function() {
    var historyDate = Date.now()
    debugger;
  }








  $scope.buildSunburst = function() {
    console.log('sunburst')
    $('#histograph > *').fadeOut(200, function() {
      $(this).remove();
    });
    var width = 500,
        height = 700,
        radius = Math.min(width, height) / 2;

    var x = d3.scale.linear()
        .range([0, 2 * Math.PI]);

    var y = d3.scale.sqrt()
        .range([0, radius]);

    var color = d3.scale.category20();
    var color2 = d3.scale.category20b();
    var color3 = d3.scale.category20c();

    var svg = d3.select("#histograph").append("svg")
        .attr("width", width)
        .attr("height", height)
      .append("g")
        .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

    var partition = d3.layout.partition()
        // .sort(function(d) {return d.size})
        .sort(null)
        .value(function(d) { return 1; });

    var arc = d3.svg.arc()
        .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
        .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
        .innerRadius(function(d) { return Math.max(0, y(d.y)); })
        .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

    // Keep track of the node that is currently being displayed as the root.
    var node;

    // d3.json("/d/4063550/flare.json", function(error, root) {
    node = $scope.flare;
    var path = svg.datum(node).selectAll("path")
        .data(partition.nodes)
        .sort(function(d) {return d.visitCount})
      .enter().append("path")
        .attr("d", arc)
        .attr("id", function(d) {return d.id_ ? d.id_ === "host" ? d.name : d.id_ : 'root'})
        .style("stroke", "#222")
        .style("fill", function(d) { return d.root ? 'transparent' : d.children ? color2(d.name) : d3.rgb(color2(d.parent.name)).darker() })
        // .style("fill", function(d) { return color((d.children ? d : d.parent).name); })
        .on("click", click)
        .on("mouseover", $scope.handleMouseOver)
        .each(stash);

    d3.selectAll("input").on("change", function change() {
      var value = this.value === "count"
          ? function() { return 1; }
          : function(d) { return d.size; };

      path
          .data(partition.value(value).nodes)
        .transition()
          .duration(300)
          .attrTween("d", arcTweenData);
    });

    function click(d) {
      node = d;
      path.transition()
        .duration(400)
        .attrTween("d", arcTweenZoom(d));
    }
    // });

    d3.select('#histograph').style("height", height + "px");

    // Setup for switching data: stash the old values for transition.
    function stash(d) {
      d.x0 = d.x;
      d.dx0 = d.dx;
    }

    // When switching data: interpolate the arcs in data space.
    function arcTweenData(a, i) {
      var oi = d3.interpolate({x: a.x0, dx: a.dx0}, a);
      function tween(t) {
        var b = oi(t);
        a.x0 = b.x;
        a.dx0 = b.dx;
        return arc(b);
      }
      if (i == 0) {
       // If we are on the first arc, adjust the x domain to match the root node
       // at the current zoom level. (We only need to do this once.)
        var xd = d3.interpolate(x.domain(), [node.x, node.x + node.dx]);
        return function(t) {
          x.domain(xd(t));
          return tween(t);
        };
      } else {
        return tween;
      }
    }

    // When zooming: interpolate the scales.
    function arcTweenZoom(d) {
      var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
          yd = d3.interpolate(y.domain(), [d.y, 1]),
          yr = d3.interpolate(y.range(), [d.y ? 40 : 0, radius]);
      return function(d, i) {
        return i
            ? function(t) { return arc(d); }
            : function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
      };
    }
  }

  $scope.calculatePercentage = function(size) {
    return (size / $scope.data.visitTotal) * 100;
  };

  var showTip = function(x, y) {
    d3.select(".tooltip-container").attr(
      "style",
        "left: " + (x + 20) + "px;" +
        "top: " + (y - 60) + "px;" +
        "opacity: 1; z-index: 100");
  };

  var hideTip = function(x, y) {
    d3.select(".tooltip-container").attr(
      "style",
        "left: " + event.screenX + "px;" +
        "top: " + (event.screenY - 60) + "px;" +
        "opacity: 0; z-index: -1");
  };

  $scope.handleMouseOver = function(data) {
    if (data.name === "Histograph") {
      $scope.hoverUrl = data.name;
      $scope.hoverVisits = $scope.data.visitTotal;
      $scope.hoverPercent = 100;
      $scope.$apply();
      showTip(event.screenX, event.screenY);
      return;
    }
    if (!data.id_) return;
    // if (data.id_ === "host") {
    //   d3.select("[data-host='" + data.name + "']").classed("hover", true);
    // } else {
    //   d3.select("#" + data.id_).classed("hover", true);
    // }
    var event = d3.event;
    $scope.hoverUrl = data.name;
    $scope.hoverVisits = data.size;
    $scope.hoverPercent = $scope.calculatePercentage(data.size);
    $scope.$apply();
    showTip(event.screenX, event.screenY);
  }

  chrome.history.onVisited.addListener(function () {
    $scope.getHistory().then(function(items) {
      $scope.prepareData();
      $scope.prepareFlare();
      $scope.buildSunburst();
    });
  })

  // Kick off the whole thing.
  $scope.getHistory("").then(function(items) {
    $scope.prepareData();
    $scope.prepareFlare();
    $scope.buildSunburst();
  });

});
