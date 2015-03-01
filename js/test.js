var histograph = angular.module('Histograph', []);

histograph.controller("MainCtrl", function($scope) {
  $scope.data = {
    search: "",
    visitTotal: 0,
    tableData: {}
  };

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
    return url.split("://")[1].split("/")[0];
  };

  var buildChild = function(hi) {

  };

  $scope.prepareFlareData = function() {
    console.log('visited')
    $scope.hostnames = {};
    $scope.flare = {
      name: 'Histograph',
      children: [],
      root: true
    };
    _.each($scope.data.items, function(hi) {
      var hn = $scope.getHostname(hi.url);
      var hostname = hn === "" ? 'File System' : hn;
      hi.name = hostname || 'File System';
      hi.name = hi.title || hi.url;
      hi.size = hi.visitCount;

      if(!$scope.hostnames[hostname]) {
        var childObj = buildChild(hi);
        var obj = {
          name: hostname,
          url: hostname,
          children: [hi],
          size: hi.size,
          visitCount: hi.visitCount
        }
        $scope.hostnames[hostname] = obj;
      } else {
        $scope.hostnames[hostname].children.push(hi);
        $scope.hostnames[hostname].size += hi.size;
        $scope.hostnames[hostname].visitCount += hi.visitCount;
      }
    });

    for (var hn in $scope.hostnames) {
      $scope.flare.children.push({
        name: hn,
        url: hn,
        size: $scope.hostnames[hn].size,
        visitCount: $scope.hostnames[hn].visitCount,
        children: $scope.hostnames[hn].children
      })
    }

    $scope.flare.children = _.sortBy($scope.flare.children, function(i) {return -i.visitCount});
  };

  $('#histo-search').on('keyup', function(e) {
    $('.histo-item').addClass('loading');
    $scope.zilch = false;
    $scope.getHistory($(this).val()).then(function(items) {
      if (!items.length) {
        $scope.getHistory().then(function(newbies) {
          $scope.data.items = newbies;
          $scope.$apply();
          $scope.prepareFlareData();
          $scope.buildSunburst();
          // $scope.buildPieUpdate()
          $scope.zilch = true;
          $('.histo-item').removeClass('loading');
        })
      } else {
        $scope.data.items = items;
        $scope.$apply();
        $scope.prepareFlareData();
        // $scope.buildPieUpdate();
        $scope.buildSunburst();
        $('.histo-item').removeClass('loading');
      }
    })
  })

  $scope.saveSnapshot = function() {
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
          .style("stroke", "#222")
          .style("fill", function(d) { return d.root ? 'transparent' : d.children ? color2(d.name) : d3.rgb(color2(d.parent.name)).darker() })
          // .style("fill", function(d) { return color((d.children ? d : d.parent).name); })
          .on("click", click)
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
          yr = d3.interpolate(y.range(), [d.y ? 120 : 0, radius]);
      return function(d, i) {
        return i
            ? function(t) { return arc(d); }
            : function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
      };
    }
  }

  chrome.history.onVisited.addListener(function () {
    $scope.getHistory().then(function(items) {
      $scope.$digest();
      $scope.prepareFlareData();
      // $scope.buildPieUpdate();
      $scope.buildSunburst();
      console.log($scope.hostnames)
    });

  })

  // Kick off the whole thing.
  $scope.getHistory().then(function(items) {
    // localStorage.setItem('histograph', JSON.stringify({})
    $scope.$digest();
    $scope.prepareFlareData();
    // $scope.buildPieUpdate();
    $scope.buildSunburst();
    console.log($scope.hostnames)
  });

});
