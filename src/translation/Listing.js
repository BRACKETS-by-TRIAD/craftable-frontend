import Vue from 'vue';

import BaseListing from '../base-components/Listing/BaseListing';

$(document).ready(function($){
    $(document).on('click', '.close_button', function (e) {
        $(this).closest('.show').removeClass('show');
    });

    $(document).on('click', '.dropdown-menu.dropdown-menu-dont-auto-close', function (e) {
        e.stopPropagation();
    });
});

Vue.component('translation-listing', {

    mixins: [BaseListing],

    props: {
        label: {
            type: String,
            default: function() {
                return 'All groups';
            }
        },
        stepCount: {
            type: Number,
            default: function(){
                return 3;
            }
        },
        locales: {}
    },

    data(){
        let exportMultiselect = {};
        Object.values(this.locales).forEach(value => {
            exportMultiselect[value] = true;
        });
        return {
            templateChecked: false,
            exportMultiselect,
            languagesToExport: this.locales,
            importLanguage: '',
            file: null,
            onlyMissing: false,
            currentStep: 1,
            scanning: false,
            filters: {
                group: null,
            },
            translationId: null,
            translationDefault: '',
            numberOfSuccessfullyImportedTranslations: 0,
            numberOfSuccessfullyUpdatedTranslations: 0,
            numberOfFoundTranslations: 0,
            numberOfTranslationsToReview: 0,
            translationsToImport: null,
            translations: {},
            importedFile: null,
        }
    },
    watch: {
        exportMultiselect: {
            handler(newVal, oldVal) {
                this.languagesToExport = [];

                Object.keys(newVal).forEach(key => {
                    if(newVal[key]) {
                        this.languagesToExport.push(key);
                    }
                });
            },
            deep: true,
        },
    },
    computed: {
        filteredGroup() {
            return this.filters.group === null ? this.label : this.filters.group;
        },
        lastStep() {
            return this.currentStep === this.stepCount;
        }
    },
    methods: {
        rescan(url) {
            this.scanning = true;
            axios.post(url)
                .then(response => {
                    this.scanning = false;
                    this.loadData(true);
                }, error => {
                    this.scanning = false;
                    this.$notify({ type: 'error', title: 'Error!', text: 'An error has occured.'});
                });
        },

        filterGroup(group) {
            this.filters.group = group;
            this.loadData(true);
        },

        resetGroup() {
            this.filters.group = null;
            this.loadData(true);
        },

        editTranslation (item) {
            this.$modal.show('edit-translation', item);
        },

        showImport () {
            this.$modal.show('import-translation');
        },

        showExport () {
            this.$modal.show('export-translation');
        },

        nextStep(){
            if(this.currentStep === 1){
                return this.$validator.validateAll()
                    .then(result => {
                        if (!result) {
                            this.$notify({ type: 'error', title: 'Error!', text: 'The form contains invalid fields.'});
                            return false;
                        }

                        let url = '/admin/translations/import';
                        let formData = new FormData();

                        formData.append('fileImport', this.file);
                        formData.append('importLanguage', this.importLanguage);
                        formData.append('onlyMissing', this.onlyMissing);

                        axios.post(url, formData, {
                            headers: {
                                'Content-Type': 'multipart/form-data'
                            }
                        }).then(response => {
                            if(response.data.hasOwnProperty('numberOfImportedTranslations') && response.data.hasOwnProperty('numberOfUpdatedTranslations')){
                                this.currentStep = 3;
                                this.numberOfSuccessfullyImportedTranslations = response.data.numberOfImportedTranslations;
                                this.numberOfSuccessfullyUpdatedTranslations= response.data.numberOfUpdatedTranslations;
                                this.loadData();
                            } else {
                                this.currentStep = 2;
                                this.numberOfFoundTranslations = Object.keys(response.data).length;
                                this.translationsToImport = response.data;

                                for(let i = 0; i < this.translationsToImport.length; i++){
                                    if(this.translationsToImport[i].hasOwnProperty('has_conflict')){
                                        if(this.translationsToImport[i].has_conflict) {
                                            this.numberOfTranslationsToReview++;
                                        }
                                    }
                                }
                            }
                        }, error => {
                            if(error.response.data === "Wrong syntax in your import")
                                this.$notify({ type: 'error', title: 'Error!', text: 'Wrong syntax in your import.'});
                            else if (error.response.data === "Unsupported file type")
                                this.$notify({ type: 'error', title: 'Error!', text: 'Unsupported file type.'});
                            else
                                this.$notify({ type: 'error', title: 'Error!', text: 'An error has occured.'});
                        });
                    });
            } else if(this.currentStep === 2){
                return this.$validator.validateAll()
                    .then(result => {
                        if (!result) {
                            this.$notify({ type: 'error', title: 'Error!', text: 'The form contains invalid fields.'});
                            return false;
                        }

                        for(let i = 0; i < this.translationsToImport.length; i++){
                            if(this.translationsToImport[i].hasOwnProperty('checkedCurrent')){
                                if(this.translationsToImport[i].checkedCurrent) {
                                    this.translationsToImport[i][this.importLanguage.toLowerCase()] = this.translationsToImport[i].current_value;
                                }
                            }
                        }

                        let url = '/admin/translations/import/conflicts';
                        let data = {
                            importLanguage: this.importLanguage,
                            resolvedTranslations: this.translationsToImport
                        };

                        axios.post(url, data).then(response => {
                            this.currentStep = 3;
                            this.numberOfSuccessfullyImportedTranslations = response.data.numberOfImportedTranslations;
                            this.numberOfSuccessfullyUpdatedTranslations= response.data.numberOfUpdatedTranslations;
                            this.loadData();
                        }, error => {
                            this.$notify({ type: 'error', title: 'Error!', text: 'An error has occured.'});
                        });
                    });
            }
        },

        previousStep(){
            this.currentStep--;
        },

        beforeModalOpen ({params}) {
            this.translationId = params.id;
            this.translationDefault = params.key;
            this.translations = {};
            for (const key of Object.keys(params.text)) {
                this.translations[key] = params.text[key];
            }
        },
        onSubmit() {
            let url = '/admin/translations/'+this.translationId;
            let data = {
                text: this.translations
            };

            axios.post(url, data).then(response => {
                this.$modal.hide('edit-translation');
                this.$notify({ type: 'success', title: 'Success!', text: 'Item successfully changed.'});
                this.loadData();
            }, error => {
                this.$notify({ type: 'error', title: 'Error!', text: 'An error has occured.'});
            });
        },
        onSubmitExport(){
            return this.$validator.validateAll()
                .then(result => {
                    if (!result) {
                        this.$notify({ type: 'error', title: 'Error!', text: 'The form contains invalid fields.'});
                        return false;
                    }

                    let data = {
                        exportLanguages: this.languagesToExport,
                    };

                    let url = '/admin/translations/export?' + $.param(data);
                    window.location = url;
                    this.$modal.hide('export-translation');
                });
        },
        handleImportFileUpload(e){
            this.file = this.$refs.file.files[0];
            this.importedFile = e.target.files[0];
        },
        onCloseImportModal() {
            this.currentStep = 1;
            this.importedFile = '';
            this.importLanguage = '';
            this.onlyMissing = false;
            this.translationsToImport = null;
        }
    }
});