import 'trumbowyg/dist/plugins/colors/trumbowyg.colors';
import 'trumbowyg/dist/plugins/colors/ui/trumbowyg.colors.css';
import 'trumbowyg/dist/plugins/base64/trumbowyg.base64.min.js';
import 'trumbowyg/dist/plugins/upload/trumbowyg.upload.js';
import 'trumbowyg/dist/plugins/noembed/trumbowyg.noembed.js';
import 'trumbowyg/dist/plugins/pasteembed/trumbowyg.pasteembed.js';
import 'trumbowyg/dist/plugins/table/ui/trumbowyg.table.css';
import 'trumbowyg/dist/plugins/table/trumbowyg.table.js';
// import 'trumbowyg/dist/plugins/template/trumbowyg.template.js';
import '../../overrides/trumbowyg.template';

const userLanguage = document.documentElement.lang;

const BaseForm = {

    props: {
        'action': {
            type: String,
            required: true
        },
        'locales': {
            type: Array
        },
        'defaultLocale': {
            type: String,
            default: function() {
                return (this.locales instanceof Array && this.locales.length > 0) ? this.locales[0] : '';
            }
        },
        'sendEmptyLocales': {
            type: Boolean,
            default: function() {
                return true;
            }
        },
        'data': {
            type: Object,
            default: function() {
                return {};
            }
        },
        'responsiveBreakpoint': {
            type: Number,
            default: 850
        }
    },

    created: function() {
        if (!!this.locales && this.locales.length > 0) {
            let form = this.form
            // this.locales.map(function(l) {
            //     if (!_.has(form, l)) {
            //         _.set(form, l, {})
            //     }
            // })
            this.currentLocale = this.defaultLocale;
        }

        //FIXME: now we can't add dynamic input in update type of form
        if (!_.isEmpty(this.data)) {
            this.form = this.data;
        }

        window.addEventListener('resize', this.onResize);
    },

    data: function() {
        const that = this;

        return {
            form: {},
            wysiwygMedia: [],
            mediaCollections: [],
            isFormLocalized: false,
            currentLocale: '',
            submiting: false,
            onSmallScreen: window.innerWidth < this.responsiveBreakpoint,
            datePickerConfig: {
                dateFormat: 'Y-m-d H:i:S',
                altInput: true,
                altFormat: 'd.m.Y',
                locale: userLanguage === 'en' ? null : require("flatpickr/dist/l10n/"+userLanguage+".js")[userLanguage]
            },
            timePickerConfig: {
                enableTime: true,
                noCalendar: true,
                time_24hr: true,
                enableSeconds: true,
                dateFormat: 'H:i:S',
                altInput: true,
                altFormat: 'H:i:S',
                locale: userLanguage === 'en' ? null : require("flatpickr/dist/l10n/"+userLanguage+".js")[userLanguage]
            },
            datetimePickerConfig: {
                enableTime: true,
                time_24hr: true,
                enableSeconds: true,
                dateFormat: 'Y-m-d H:i:S',
                altInput: true,
                altFormat: 'd.m.Y H:i:S',
                locale: userLanguage === 'en' ? null : require("flatpickr/dist/l10n/"+userLanguage+".js")[userLanguage]
            },
            wysiwygConfig: {
                placeholder: 'Type a text here',
                modules: {
                    toolbar: {
                        container: [
                            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            [{ 'color': [] }, { 'background': [] }],
                            [{ 'align': [] }],
                            ['link', 'image'],
                            ['clean']
                        ]
                    }
                }
            },
            mediaWysiwygConfig: {
                autogrow: true,
                imageWidthModalEdit: true,
                btnsDef: {
                    image: {
                        dropdown: ['insertImage', 'upload', 'base64'],
                        ico: 'insertImage'
                    },
                    align: {
                        dropdown: ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'],
                        ico: 'justifyLeft'
                    }
                },
                btns: [
                    ['formatting'],
                    ['strong', 'em', 'del'],
                    ['align'],
                    ['unorderedList', 'orderedList', 'table'],
                    ['foreColor', 'backColor'],
                    ['link', 'noembed', 'image'],
                    ['template'],
                    ['fullscreen', 'viewHTML'],
                ],
                plugins: {
                    upload: {
                        // https://alex-d.github.io/Trumbowyg/documentation/plugins/#plugin-upload
                        serverPath: '/admin/wysiwyg-media',
                        imageWidthModalEdit: true,
                        success(data, trumbowyg, $modal, values) {
                            that.wysiwygMedia.push(data.mediaId);

                            function getDeep(object, propertyParts) {
                                var mainProperty = propertyParts.shift(),
                                    otherProperties = propertyParts;

                                if (object !== null) {
                                    if (otherProperties.length === 0) {
                                        return object[mainProperty];
                                    }

                                    if (typeof object === 'object') {
                                        return getDeep(object[mainProperty], otherProperties);
                                    }
                                }
                                return object;
                            }

                            if (!!getDeep(data, trumbowyg.o.plugins.upload.statusPropertyName.split('.'))) {
                                var url = getDeep(data, trumbowyg.o.plugins.upload.urlPropertyName.split('.'));
                                trumbowyg.execCmd('insertImage', url);
                                var $img = $('img[src="' + url + '"]:not([alt])', trumbowyg.$box);
                                $img.attr('alt', values.alt);
                                if (trumbowyg.o.imageWidthModalEdit && parseInt(values.width) > 0) {
                                    $img.attr({
                                        width: values.width
                                    });
                                }
                                setTimeout(function () {
                                    trumbowyg.closeModal();
                                }, 250);
                                trumbowyg.$c.trigger('tbwuploadsuccess', [trumbowyg, data, url]);
                            } else {
                                trumbowyg.addErrorOnModalField(
                                    $('input[type=file]', $modal),
                                    trumbowyg.lang[data.message]
                                );
                                trumbowyg.$c.trigger('tbwuploaderror', [trumbowyg, data]);
                            }
                        }
                    },
                }
            }
        }
    },

    computed: {
        otherLocales: function() {
            return this.locales.filter(x => x != this.defaultLocale);
        },
        showLocalizedValidationError: function() {
            // TODO ked sme neni na mobile, tak pozerat zo vsetkych
            return this.otherLocales.some(lang => {
                return this.errors.items.some(item => {
                    return item.field.endsWith('_'+lang) || item.field.startsWith(lang+'_');
                });
            });
        }
    },

    methods: {
        getPostData() {
            if(this.mediaCollections) {
                this.mediaCollections.forEach((collection, index, arr)=>{
                    if(this.form[collection]) {
                        console.warn("MediaUploader warning: Media input must have a unique name, '"+collection+"' is already defined in regular inputs.");
                    }

                    if(this.$refs[collection+'_uploader']) {
                        this.form[collection] = this.$refs[collection+'_uploader'].getFiles();
                    }
                });
            }
            this.form['wysiwygMedia'] = this.wysiwygMedia;

            return this.form;
        },
        onSubmit() {
            return this.$validator.validateAll()
                .then(result => {
                    if (!result) {
                        this.$notify({ type: 'error', title: 'Error!', text: 'The form contains invalid fields.'});
                        return false;
                    }

                    var data = this.form;
                    if (!this.sendEmptyLocales) {
                        data = _.omit(this.form, this.locales.filter(locale => _.isEmpty(this.form[locale])));
                    }

                    this.submiting = true;

                    axios.post(this.action, this.getPostData())
                        .then(response => this.onSuccess(response.data))
                        .catch(errors => this.onFail(errors.response.data.errors))
                });
        },
        onSuccess(data) {
            this.submiting = false;
            if (data.redirect) {
                window.location.replace(data.redirect)
            }
        },
        onFail(errors) {
            this.submiting = false;
            var bag = this.$validator.errors;
            Object.keys(errors).map(function(key) {
                var splitted = key.split('.', 2);
                // we assume that first dot divides column and locale (TODO maybe refactor this and make it more general)
                if (splitted.length > 1) {
                    bag.add(splitted[0]+'_'+splitted[1], errors[key][0]);
                } else {
                    bag.add(key, errors[key][0]);
                }
            });
        },
        getLocalizedFormDefaults() {
            var object = {};
            this.locales.forEach((currentValue, index, arr)=>{
                object[currentValue] = null;
            });
            return object;
        },
        showLocalization() {
            this.isFormLocalized = true;
            this.currentLocale = this.otherLocales[0];
            $('.container-xl').addClass('width-auto');
        },
        hideLocalization() {
            this.isFormLocalized = false;
            $('.container-xl').removeClass('width-auto');
        },
        validate(event) {
            this.$validator.errors.remove(event.target.name);
        },
        shouldShowLangGroup(locale) {
            if (!this.onSmallScreen) {
                if(this.defaultLocale == locale) return true;

                return this.isFormLocalized && this.currentLocale == locale;
            } else {
                return this.currentLocale == locale;
            }
        },
        onResize() {
            this.onSmallScreen = window.innerWidth < this.responsiveBreakpoint;
        }
    }
};

export default BaseForm