angular.module('Test.xx', ['xx.a']).controller('xx', function($scope) {
  console.log($scope)
});

angular.module('Test.bb', ['xx.b']).controller('cc', function($scope) {
  console.log($scope)
});
