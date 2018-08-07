(function ($) {
    'use strict';

    // My plugin default options
    var defaultOptions = {
        noEmbedEndpoint: 'https://noembed.com/embed?nowrap=on'
    };

    $.extend(true, $.trumbowyg, {
        // Add some translations
        langs: {
            en: {
                editNoEmbedTemplate: 'Edit embed',
            }
        },
        // Add our plugin to Trumbowyg registred plugins
        plugins: {
            editNoEmbedTemplate: {
                init: function(trumbowyg) {
                    // Fill current Trumbowyg instance with my plugin default options
                    trumbowyg.o.plugins.editNoEmbedTemplate = $.extend(true, {},
                        defaultOptions,
                        trumbowyg.o.plugins.editNoEmbedTemplate || {}
                    );

                    $('body').on('dblclick', '.wysiwyg-noembed', function() {
                        var $iframe = $(this).find('iframe');
                        var $editor = $iframe.closest('.trumbowyg-editor');
                        var options = {
                            url: {
                                label: 'URL',
                                value: $iframe.attr('src'),
                                required: true
                            }
                        };

                        trumbowyg.openModalInsert(trumbowyg.lang.editNoEmbedTemplate, options, function (value) {
                            $.ajax({
                                url: trumbowyg.o.plugins.editNoEmbedTemplate.noEmbedEndpoint,
                                type: 'GET',
                                data: value,
                                cache: false,
                                dataType: 'jsonp',
                                crossOrigin: true,
                                success: trumbowyg.o.plugins.editNoEmbedTemplate.success || function (data) {
                                    if (data.html) {
                                        $iframe.replaceWith($(data.html));
                                        trumbowyg.html($editor.html());
                                        setTimeout(function () {
                                            trumbowyg.closeModal();
                                        }, 250);
                                    } else {
                                        trumbowyg.addErrorOnModalField(
                                            $('input[type=text]', $modal),
                                            data.error
                                        );
                                    }
                                },
                                error: trumbowyg.o.plugins.editNoEmbedTemplate.error || function () {
                                    trumbowyg.addErrorOnModalField(
                                        $('input[type=text]', $modal),
                                        trumbowyg.lang.noembedError
                                    );
                                }
                            });
                        });
                    });
                },
                tagHandler: function(element, trumbowyg) {
                    return [];
                },
                destroy: function() {
                }
            }
        }
    })
})(jQuery);