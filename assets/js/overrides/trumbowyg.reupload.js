(function ($) {
    'use strict';

    // My plugin default options
    var defaultOptions = {
    };

    $.extend(true, $.trumbowyg, {
        // Add some translations
        langs: {
            en: {
                reupload: 'Reupload',
                reuploadImage: 'Reupload Image'
            }
        },
        // Add our plugin to Trumbowyg registred plugins
        plugins: {
            reupload: {
                init: function(trumbowyg) {
                    // Fill current Trumbowyg instance with my plugin default options
                    trumbowyg.o.plugins.reupload = $.extend(true, {},
                        defaultOptions,
                        trumbowyg.o.plugins.reupload || {}
                    );

                    trumbowyg.o.imgDblClickHandler = (function() {
                        var t = trumbowyg;

                        return function () {
                            var $img = $(this),
                                src = $img.attr('src'),
                                base64 = '(Base64)';

                            if (src.indexOf('data:image') === 0) {
                                src = base64;
                            }

                            var options = {
                                url: {
                                    label: 'URL',
                                    value: src,
                                    required: true
                                },
                                reupload: {
                                    label: trumbowyg.lang.reuploadImage,
                                    value: src,
                                    type: 'file',
                                    attributes: {
                                        accept: 'image/*'
                                    }
                                },
                                alt: {
                                    label: t.lang.description,
                                    value: $img.attr('alt')
                                },
                            };

                            if (t.o.imageWidthModalEdit) {
                                options.width = {
                                    value: $img.attr('width') ? $img.attr('width') : ''
                                };
                            }

                            var $modal = t.openModalInsert(t.lang.insertImage, options, function (v) {
                                $img.attr({
                                    alt: v.alt
                                });

                                if (t.o.imageWidthModalEdit) {
                                    if (parseInt(v.width) > 0) {
                                        $img.attr({
                                            width: v.width
                                        });
                                    } else {
                                        $img.removeAttr('width');
                                    }
                                }

                                if (v.src !== base64 && !v.reupload) {
                                    $img.attr({
                                        src: v.url
                                    });
                                    return true;
                                }

                                if (v.reupload) {
                                    var prefix = trumbowyg.o.prefix;
                                    var data = new FormData();
                                    data.append(trumbowyg.o.plugins.upload.fileFieldName, $('.trumbowyg-modal input[type=file]').get(0).files[0]);

                                    trumbowyg.o.plugins.upload.data.map(function (cur) {
                                        data.append(cur.name, cur.value);
                                    });

                                    $.map(v, function (curr, key) {
                                        if (key !== 'file') {
                                            data.append(key, curr);
                                        }
                                    });

                                    if ($('.' + prefix + 'progress', $modal).length === 0) {
                                        $('.' + prefix + 'modal-title', $modal)
                                            .after(
                                                $('<div/>', {
                                                    'class': prefix + 'progress'
                                                }).append(
                                                    $('<div/>', {
                                                        'class': prefix + 'progress-bar'
                                                    })
                                                )
                                            );
                                    }

                                    $.ajax({
                                        url: trumbowyg.o.plugins.upload.serverPath,
                                        headers: trumbowyg.o.plugins.upload.headers,
                                        xhrFields: trumbowyg.o.plugins.upload.xhrFields,
                                        type: 'POST',
                                        data: data,
                                        cache: false,
                                        dataType: 'json',
                                        processData: false,
                                        contentType: false,

                                        progressUpload: function (e) {
                                            $('.' + prefix + 'progress-bar').css('width', Math.round(e.loaded * 100 / e.total) + '%');
                                        },

                                        success: function (data) {
                                            trumbowyg.o.plugins.reupload.success(data, trumbowyg, $modal, v, $img);
                                        },

                                        error: trumbowyg.o.plugins.upload.error || function () {
                                            trumbowyg.addErrorOnModalField(
                                                $('input[type=file]', $modal),
                                                trumbowyg.lang.uploadError
                                            );
                                            trumbowyg.$c.trigger('tbwuploaderror', [trumbowyg]);
                                        }
                                    });
                                }
                            });
                            return false;
                        };
                    })();

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