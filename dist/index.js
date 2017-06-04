'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _Promise = _interopDefault(require('babel-runtime/core-js/promise'));
var _regeneratorRuntime = _interopDefault(require('babel-runtime/regenerator'));
var _asyncToGenerator = _interopDefault(require('babel-runtime/helpers/asyncToGenerator'));
var _extends = _interopDefault(require('babel-runtime/helpers/extends'));
var _classCallCheck = _interopDefault(require('babel-runtime/helpers/classCallCheck'));
var _createClass = _interopDefault(require('babel-runtime/helpers/createClass'));
var path = _interopDefault(require('path'));
var fs = _interopDefault(require('fs'));
var babylon = require('babylon');
var traverse = _interopDefault(require('babel-traverse'));
var generate = _interopDefault(require('babel-generator'));
var jsBeautify = require('js-beautify');
var mkdirp = _interopDefault(require('mkdirp'));

var DEFAULT_OPTIONS = {
  methodName: ['controller', 'directive', 'factory', 'service'],

  src: '',

  moduleName: undefined,

  dist: path.resolve(__dirname, '../dist')
};

var Parse = function () {
  function Parse() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT_OPTIONS;

    _classCallCheck(this, Parse);

    this.options = _extends({}, DEFAULT_OPTIONS, options);
    if (this.options.src.length <= 0) {
      console.error('\u9700\u8981\u62C6\u5206\u7684\u6587\u4EF6\u8DEF\u5F84 src \u4E0D\u80FD\u4E3A\u7A7A');
      return;
    }
    if (!Array.isArray(this.options.methodName)) {
      this.options.methodName = [this.options.methodName];
    }
    this.arrAst = [];
    this.init();
  }

  _createClass(Parse, [{
    key: 'init',
    value: function () {
      var _ref = _asyncToGenerator(_regeneratorRuntime.mark(function _callee() {
        var moduleAsts, functionAsts;
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.prev = 0;
                _context.next = 3;
                return this.readFileValue();

              case 3:
                this.value = _context.sent;

                this.parseAst();

                if (!(this.arrAst.length <= 0)) {
                  _context.next = 8;
                  break;
                }

                console.error('没有符合规则的 提取方法 :)');
                return _context.abrupt('return');

              case 8:
                moduleAsts = this.arrAst.filter(function (item) {
                  return item.type === 'module';
                });
                functionAsts = this.arrAst.filter(function (item) {
                  return item.type === 'function';
                });

                this.generateModuleJs(moduleAsts, functionAsts);
                this.generateFunctionJs(functionAsts);
                console.info('\u5206\u6790\u51FA\u6A21\u5757 ' + moduleAsts.length + ' \u4E2A \u63D0\u53D6\u5230\u5185\u5BB9\uFF08controller, ... \uFF09 ' + functionAsts.length + ' \u4E2A\u6587\u4EF6');
                _context.next = 18;
                break;

              case 15:
                _context.prev = 15;
                _context.t0 = _context['catch'](0);

                console.error(_context.t0);

              case 18:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[0, 15]]);
      }));

      function init() {
        return _ref.apply(this, arguments);
      }

      return init;
    }()
  }, {
    key: 'readFileValue',
    value: function () {
      var _ref2 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee2() {
        var _this = this;

        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                return _context2.abrupt('return', new _Promise(function (resolve, reject) {
                  fs.readFile(_this.options.src, function (err, data) {
                    if (err) {
                      console.error('error', err);
                      return reject();
                    }
                    return resolve(data.toString());
                  });
                }));

              case 1:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function readFileValue() {
        return _ref2.apply(this, arguments);
      }

      return readFileValue;
    }()
  }, {
    key: 'parseAst',
    value: function parseAst() {
      var self = this;
      this.ast = babylon.parse(this.value);
      var moduleName = void 0;

      traverse(this.ast, {
        enter: function enter(path$$1) {},
        exit: function exit(path$$1) {
          var node = path$$1.node;
          var callee = node.callee;
          if (node.type === 'CallExpression' && callee.type === 'MemberExpression' && callee.computed === false) {
            var obj = callee.object;
            var method = callee.property;
            var args = node.arguments;

            if (args.length === 2 && method.name === 'module' && self.options.moduleName === undefined) {
              moduleName = args[0].value;

              self.arrAst.push({
                type: 'module',
                ast: args[1],
                methodName: moduleName
              });
            }

            if (args.length === 2 && self.options.methodName.indexOf(method.name) !== -1) {
              self.arrAst.push({
                type: 'function',
                ast: args[1],
                name: args[0].value,
                moduleName: self.options.moduleName || moduleName,
                methodName: method.name
              });
            }
          }
        }
      });
    }
  }, {
    key: 'generateFunctionJs',
    value: function generateFunctionJs(modules) {
      var _this2 = this;

      modules.forEach(function (item) {
        var name = item.name,
            moduleName = item.moduleName,
            methodName = item.methodName,
            ast = item.ast;

        var js = generate(ast, { retainFunctionParens: true }, _this2.value).code;

        var source = ';angular.module(\'' + moduleName + '\').' + methodName + '(\'' + name + '\', ' + js + ');';

        var dist = _this2.options.dist + '/' + methodName + 's/';
        _this2.mkdirFile(dist, methodName, source, name);
      });
    }
  }, {
    key: 'generateModuleJs',
    value: function generateModuleJs() {
      var _this3 = this;

      var modules = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : ['bq.controller'];
      var functionAsts = arguments[1];

      var source = void 0;
      var moduleName = void 0;
      var options = this.options;
      var moduleDist = options.dist + '/modules/';
      if (options.moduleName !== undefined) {
        moduleName = this.options.moduleName;
        source = ';angular.module(\'' + options.moduleName + '\', []); ' + this.generateImports(functionAsts) + ' ';
      } else {
        var arrModules = [];
        var arrImports = [];
        moduleName = modules[0].methodName;
        modules.forEach(function (item) {
          var methodName = item.methodName,
              ast = item.ast;

          var js = generate(ast, { retainFunctionParens: true }, _this3.value).code;
          var asts = functionAsts.filter(function (item) {
            return item.moduleName === methodName;
          });
          arrImports.push(_this3.generateImports(asts));
          arrModules.push(';angular.module(\'' + methodName + '\', ' + js + '); ');
        });

        source = arrModules.join('') + ' ' + arrImports.join('');
      }
      this.mkdirFile(moduleDist, 'module', source, moduleName);
    }
  }, {
    key: 'generateImports',
    value: function generateImports(imports) {
      var source = [];
      imports.forEach(function (item) {
        source.push('import \'app@/' + item.methodName + 's/' + item.name + '.js\' ');
      });
      return source.join('');
    }
  }, {
    key: 'mkdirFile',
    value: function mkdirFile(moduleDist, subPath, source, fileName) {
      var _this4 = this;

      fs.access(moduleDist, fs.F_OK, function (err) {
        if (err) {
          mkdirp(moduleDist, function (mkErr) {
            if (mkErr) return console.error(mkErr);
            _this4.writeFile(subPath, source, fileName);
          });
          return;
        }
        _this4.writeFile(subPath, source, fileName);
      });
    }
  }, {
    key: 'writeFile',
    value: function writeFile(subPath, source, fileName) {
      fileName = fileName.toString();

      fs.writeFile(this.resolve(subPath, fileName), jsBeautify.js_beautify(source, { indent_size: 2 }), function (err) {
        if (err) {
          console.error('\u5199\u5165\u6587\u4EF6\u62A5\u9519' + fileName, err);
        }
      });
    }
  }, {
    key: 'resolve',
    value: function resolve(subPath, fileName) {
      return this.options.dist + '/' + subPath + 's/' + fileName + '.js';
    }
  }]);

  return Parse;
}();


module.exports = exports['default'];

var index = function () {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  new Parse(options);
};
module.exports = exports['default'];

module.exports = index;
