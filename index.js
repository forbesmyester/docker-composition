'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var MappingSpecification = (function () {
    function MappingSpecification(composeFile, service, port) {
        _classCallCheck(this, MappingSpecification);

        this.composeFile = composeFile;
        this.service = service;
        this.port = port;
    }

    _createClass(MappingSpecification, [{
        key: 'equals',
        value: function equals(mappingSpecification) {
            return this.composeFile == mappingSpecification.composeFile && this.service == mappingSpecification.service && this.port == mappingSpecification.port;
        }
    }]);

    return MappingSpecification;
})();

exports.MappingSpecification = MappingSpecification;

var Ports = (function () {
    function Ports() {
        _classCallCheck(this, Ports);

        this.mappings = [];
    }

    _createClass(Ports, [{
        key: 'unregister',
        value: function unregister(mappingSpecification, next) {
            (0, _assert2['default'])(mappingSpecification instanceof MappingSpecification);
            this.mappings = this.mappings.filter(function (mapping) {
                return mappingSpecification.port = mapping.port;
            });
            next(null);
        }
    }, {
        key: 'register',
        value: function register(mappingSpecification, next) {
            (0, _assert2['default'])(mappingSpecification instanceof MappingSpecification);
            var already = this.mappings.filter(function (mapping) {
                return mappingSpecification.port = mapping.port;
            });
            if (already.length) {
                return next(null, already[0]);
            }
            this.mappings.push(mappingSpecification);
            next(null, mappingSpecification);
        }
    }]);

    return Ports;
})();

exports.Ports = Ports;

