'use strict';

var through = require('through2'),
    PluginError = require('gulp-util').PluginError,
    rework = require('rework');

function removeNamespacedBody() {
    return function (style) {
        style.rules = style.rules.map(function (rule) {
            if (!rule.selectors) {
                return rule;
            }
            rule.selectors = rule.selectors.map(function (selector) {
                return selector.replace(/\sbody/gi, '');
            });
            return rule;
        });
    };
}

function prefixCss(prefix) {
    return function(style) {
        style.rules = style.rules.map(function(rule) {
            if (!rule.selectors) {
                return rule;
            }

            var doNamespace = true;

            /**
             * Allow CSS to avoid using the namespace if it uses the no-namespace class
             */
            rule.declarations.forEach(function(declaration) {
                if (declaration.comment && /rework:\s*no-namespace/i.test(declaration.comment)) {
                    doNamespace = false;
                }
            });

            if (doNamespace) {
                rule.selectors = rule.selectors.map(function(selector) {
                    if (':root' === selector) {
                        return prefix;
                    }
                    selector = selector.replace(/^\:root\s?/, '');
                    return prefix + ' ' + selector;
                });
            }

            return rule;
        });
    }
}

function addNamespaceToCss(text, options) {
    return rework(text)
        .use(prefixCss(options.namespace))
        .use(removeNamespacedBody())
        .toString({ compress: true });
};


module.exports = function(opts) {
    if (!opts.namespace) {
        throw new PluginError('namespace-css', 'Required namespace option not provided');
    }

    function NamespaceCss(file, enc, cb) {
        if (file.isStream()) {
            this.emit('error', new PluginError('namespace-css', 'Streaming not supported'));
            return cb();
        }

        if (file.isBuffer()) {
            file.contents = new Buffer(addNamespaceToCss(String(file.contents), opts));
        }

        this.push(file);
        cb();
    }

    return through.obj(NamespaceCss);
};
