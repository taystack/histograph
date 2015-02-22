var histograph = angular.module('Histograph', []);

histograph.controller("MainCtrl", function($scope) {
  $scope.data = {
    search: "",
    visitTotal: 0,
    tableData: []
  };

  // use: $scope.getHistory.then(function(items) {...})
  $scope.getHistory = function(text) {
    var txt = text || "";
    var history = new Promise(function(resolve, reject) {
      chrome.history.search({"text": txt, "maxResults": 10000}, function(items) {
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
    var tmp = document.createElement("a");
    tmp.href = url;
    return tmp.hostname;
  };

  $scope.buildGraphData = function(historyItems) {
    _.each(historyItems, function(hi) {
      var hostname = $scope.getHostname(hi.url);
    })
  }

  $('#histo-search').on('keyup', function(e) {
    $('.histo-item').addClass('loading');
    $scope.zilch = false;
    $scope.getHistory($(this).val()).then(function(items) {
      if (!items.length) {
        $scope.getHistory().then(function(newbies) {
          $scope.data.items = newbies;
          $scope.$apply();
          $scope.zilch = true;
          $('.histo-item').removeClass('loading');
        })
      } else {
        $scope.data.items = items;
        $scope.$apply();
        $('.histo-item').removeClass('loading');
      }
    })
  })

  $scope.buildSunburst = function() {}
  $scope.buildLines = function() {}

  // Kick off the whole thing.
  $scope.getHistory().then(function(items) {
    $scope.data.items = items;
    $scope.buildGraphData(items);
    $scope.$apply();
  });

});