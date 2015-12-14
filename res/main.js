(function() {
  "use strict";
  
  
  //////// GENERAL ////////
  
  /* uses websockets instead of hosted scripts for the content security */
  Firebase.INTERNAL.forceWebSockets();
  
  /* Create voter app */
  var voterApp = angular.module('voterApp', ['ngRoute', 'ngAnimate', 'ngMaterial', 'ngMdIcons', 'firebase', 'relativeDate', 'mdThemeColors'], function($compileProvider) {
    
    //prevent ng-src from expanding to full url, allow blobs
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|blob|file|chrome-extension):|data:image\//);
    //prevent anchors from being expaneded
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|chrome-extension):/);
    
  });
  
  /* custom blob directives */
  function getBlob(url, callback) {
    if (!url)
      return;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onload = function(e) {
      callback(window.URL.createObjectURL(this.response));
    };
    xhr.send();
  }
  voterApp.directive('srcBlob', function() {
      return {
          link: function(scope, element, attrs) {
            attrs.$observe('srcBlob', function(val) {
              getBlob(val, function(src) {
                attrs.$set('src', src);
              });
            });
          }
      };
  }).directive('backgroundBlob', function() {
      return {
          link: function(scope, element, attrs) {
            attrs.$observe('backgroundBlob', function(val) {
              getBlob(val, function(url) {
                element.css('background-image', 'url("' + url + '")');
              });
            });
          }
      };
  });
  
  /* configure material design theme */
  voterApp.config(function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
      .primaryPalette('purple')
      .accentPalette('pink');
  });
  
  
  //////// APP-SPECIFIC LOGIC ////////
  
  /* rotue configuration */
  voterApp.config(function($routeProvider) {
    $routeProvider.when('/', {
        templateUrl: 'pages/main.html',
        controller: 'mainController'
    }).when('/loading', {
        templateUrl: 'pages/loading.html',
        //controller: 'detailController'
    }).otherwise({
        title: "Unknown Page",
        templateUrl: 'pages/unknown.html'
    });
  });
  
  /* main controller */
  voterApp.controller('voterController', function($scope, $location, mdThemeColors) {
    
    $scope.colors = mdThemeColors;
    $scope.isActive = function(location) {
        return location === $location.path();
    };
  });
  
  
  voterApp.controller('mainController', function($scope, $mdSidenav, $log, $firebaseAuth, $firebaseObject, $firebaseArray, mdThemeColors) {
    
    $scope.colors = mdThemeColors;
    $scope.toggleLeft = function() {
      $mdSidenav('left').toggle();
    };
    
    var ref = new Firebase("https://phsasbvoter.firebaseio.com");
    
    $scope.auth = $firebaseAuth(ref);
    $scope.auth.$onAuth(function(authData) {
      if (!authData) {
        $log.warn('Logged out! Reauthenticating...');
        chrome.identity.getAuthToken({
          interactive: true
        }, function(token) {
          $scope.auth.$authWithOAuthToken("google", token);
        });
      }
      else {
        $log.log('Authenticated', authData);
        ref.child('users/' + authData.uid).set({
          name: authData.google.displayName,
          avatar: authData.google.profileImageURL
        });
        
        $scope.meta = $firebaseObject(ref.child('meta'));
        
        var norm = new Firebase.util.NormalizedCollection(
          ref.child('polls'),
          [ref.child('users'), 'users', 'polls.owner']
        );
        var pollsRef = norm.select('polls.owner', { key: 'polls.$value', alias: 'poll' }, { key: 'users.$value', alias: 'user' }).ref();
        
        $scope.polls = $firebaseArray(pollsRef);
      }
    });
  });
})();