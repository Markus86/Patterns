define([
    'require',
    '../core/parser',
    '../lib/jquery',
    '../lib/jquery.form'
], function(require) {
    var Parser = require('../core/parser'),
        parser = new Parser("source; target; replace");

    var init = function($el, opts) {
        // XXX: if opts, set them on $el as if defined there

        if ($el.is('a')) $el.click(function(ev) {
            ev.preventDefault();
            trigger($el);
        });

        if ($el.is('form')) $el.submit(function(ev) {
            ev.preventDefault();
            trigger($el);
        });

        if ($el.hasClass('autoLoading-visible')) {
            trigger($el);
        }
    };

    var _injectmethod = function(name, method) {
        var injectwrapper = function($sources, $targets, suppress) {
            // no $targets -> called as a jquery method
            // XXX: is it good to have that here?
            if ($targets === undefined) $targets = this;
            $targets = method($sources, $targets);
            if (!suppress) {
                $targets.trigger('inject', {
                    method: name,
                    $sources: $sources
                });
            }
            return $targets;
        };
        return injectwrapper;
    };

    var content = _injectmethod("content", function($sources, $targets) {
        $targets.each(function() {
            $(this).html($sources.html());
        });
        return $targets;
    });

    var replace = _injectmethod("replace", function($sources, $targets) {
        if ($targets.length === 1) {
            $targets.replaceWith($sources);
            return $sources;
        }
        $targets.each(function() {
            $(this).replaceWith($sources.clone().addClass(replace.marker));
        });
        return $("." + replace.marker).removeClass(replace.marker);
    });
    replace.marker = 'tmp-injection-marker';


    // create an injector to be run on ajax success
    var injector = function($el, method_name, opts) {
        // hack to support modals
        var modal = $el.hasClass('modal');
        if (modal) {
            if (opts.target) console.warn('Overriding target for modal');
            opts.target = '#modal';
            method_name = "replace";
        }

        if (!opts.target) {
            opts.target = opts.source;
        }

        var method = pattern[method_name],
            $targets = $(opts.target);


        if ($targets.length === 0) {
            if (opts.target.slice(0,1) !== '#') {
                console.error('only id supported for non-existing target');
            }
            $targets = $('<div />').attr({id: opts.target.slice(1)});
            $('body').append($targets);
        }

        var inject = function(data, textStatus, jqXHR) {
            // just copied from old inject code
            data = data
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                .replace(/<head\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/head>/gi, "")
                .replace(/<body(.*)>/gi, '<div id="__original_body">')
                .replace(/<\/body(.*)>/gi,'</div>');
            var $sources = $('<div/>').html(data).find(opts.source);

            if ($sources.length === 0) console.error('inject: Sources are empty');

            if (modal) {
                var $modal = $('<div id="modal" class="modal" />');
                if ($sources.length === 1) {
                    // for single source copy its content into the modal
                    $sources = $modal.html($sources.html());
                } else {
                    // for multiple sources wrap them into a modal
                    $sources = $modal.html($sources);
                }
            }

            // perform injection, suppressing event
            $targets = method($sources, $targets, true);

            // trigger inject event
            $targets.trigger('inject', {
                method: method_name,
                $sources: $sources,
                $trigger_el: $el
            });
        };
        return inject;
    };

    var trigger = function($el) {
        // retrieve href and split into url and default srcid
        var href = ($el.is('form')
                    ? $el.attr('action')
                    : $el.attr('href')).split('#'),
            url = href.shift(),
            srcid = href.pop();
        if (href.length > 0) console.log('inject: only one #source in href');

        // set default source id and parse opts
        var defaults = { source: srcid && ('#' + srcid) },
            opts_str = $el.attr('data-inject') || "",
            opts = parser.parse(opts_str, defaults),
            callback;

        // default: replace targets content with sources content
        var method_name = "content";

        // post-process options
        if (opts.replace) {
            opts.target = opts.replace;
            method_name = "replace";
        }
        if (!opts.source) {
            opts.source = '#__original_body';
        }

        // perform ajax call
        var params = {
            url: url,
            type: $el.is('form') ? 'POST' : 'GET',
            error: function(jqXHR, textStatus, errorThrown) {
                console.error(url, jqXHR, textStatus, errorThrown);
            },
            success: injector($el, method_name, opts)
        };
        if ($el.is('form')) {
            $el.ajaxSubmit(params);
        } else {
            $.ajax(params);
        }
    };

    var pattern = {
        initialised_class: 'inject',
        markup_trigger: 'a.inject, a[data-inject], form.inject, form[data-inject]',
        supported_tags: ['a', 'form'], // XXX: unsupported
        init: init,
        content: content,
        replace: replace,
        trigger: trigger
    };

    return pattern;
});
