define([
    'require',
    '../lib/jquery'
], function(require) {

    var init = function($el, opts) {
        var $first = $el.children(':first'),
            $rest = $el.children(':not(:first)'),
            $header = $('<div class="header" />'),
            $body = $('<div class="body" />'),
            $closebutton = $(
                '<button type="button" class="close-panel">Close</button>');

        // separate into header and body
        if ($rest.length === 0) {
            $first.wrap($body);
            $el.prepend($header);
        } else {
            $first.wrap($header);
            $rest.wrapAll($body);
        }

        // add close-panel button to header
        $('.header', $el).append($closebutton);

        // event handler to remove element
        var remove = function(ev) {
            ev.preventDefault();
            $(ev.currentTarget).off('.remove.modal');
            $el.remove();
        };

        // remove on ESC
        $(document).on('keyup.remove.modal', function(ev) {
            if (ev.which == 27) remove(ev);
        });
        // remove on close-panel button click
        $el.find('.close-panel').on('click.remove.modal', remove);
        // remove on click of triggering element
        if (opts && opts.$trigger_el) opts.$trigger_el.on('click.remove.modal', remove);
    };

    var pattern = {
        markup_trigger: "div.modal",
        initialised_class: "modal",
        default_opts: {
            shown: false
        },
        init: init
    };

    return pattern;
});
