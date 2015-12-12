Firebase.INTERNAL.forceWebSockets();

angular.module('VoterApp', ['ngMaterial', 'ngMdIcons', 'firebase', 'relativeDate'], function($compileProvider) {
  
  //prevent ng-src from expanding to full url
  $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|blob|file|chrome-extension):|data:image\//);
  //prevent anchors from being expaneded
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|chrome-extension):/);
  
}).directive('srcBlob', function() {
    return {
        link: function(scope, element, attrs) {
          attrs.$observe('srcBlob', function(val){
            var xhr = new XMLHttpRequest();
            xhr.open('GET', val, true);
            xhr.responseType = 'blob';
            xhr.onload = function(e) {
              var src = window.URL.createObjectURL(this.response);
              attrs.$set('src', src);
            };
            xhr.send();
          });
        }
    };
}).config(function($mdThemingProvider) {
  $mdThemingProvider.theme('default')
    .primaryPalette('deep-purple')
    .accentPalette('pink');
}).controller('VoterController', function($scope, $mdSidenav, $log, $firebaseAuth, $firebaseObject, $firebaseArray) {
  
  var ref = new Firebase("https://phsasbvoter.firebaseio.com");
  
  
  $scope.toggleLeft = function() {
    $mdSidenav('left').toggle();
  };
  
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
      
      var norm = new Firebase.util.NormalizedCollection(
        ref.child('polls'),
        [ref.child('users'), 'users', 'polls.owner']
      );
      var pollsRef = norm.select('polls.owner', { key: 'polls.$value', alias: 'poll' }, { key: 'users.$value', alias: 'user' }).ref();
      
      $scope.polls = $firebaseArray(pollsRef);
    }
  });
});
