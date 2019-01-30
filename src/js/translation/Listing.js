import BaseListing from '../base-components/Listing/BaseListing';

Vue.component('translation-listing', {

    mixins: [BaseListing],

    props: {
        label: {
            type: String,
            default: function() {
                return 'All groups';
            }
        },
        stepcount: {
            type: Number,
            default: function(){
                return 3;
            }
        }
    },

    data(){
        return {
            templateChecked: false,
            exportLanguage: '',
            templateLanguage: '',
            importLanguage: '',
            file: null,
            onlyMissing: false,
            currentstep: 1,
            scanning: false,
            filters: {
                group: null
            },
            translationId: null,
            translationDefault: '',
            numberOfSuccessfullyImportedLanguages: 0,
            numberOfSuccessfullyUpdatedLanguages: 0,
            numberOfFoundTranslations: 0,
            numberOfTranslationsToReview: 0,
            conflicts: null,
            translations: {},
            importedFile: null,
        }
    },

    computed: {
        filteredGroup() {
            return this.filters.group === null ? this.label : this.filters.group;
        },
        lastStep() {
            return this.currentstep === this.stepcount;
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
            if(this.currentstep === 1){
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
                                this.currentstep = 3;
                                this.numberOfSuccessfullyImportedLanguages = response.data.numberOfImportedTranslations;
                                this.numberOfSuccessfullyUpdatedLanguages = response.data.numberOfUpdatedTranslations;
                                this.loadData();
                            } else {
                                this.currentstep = 2;
                                this.numberOfFoundTranslations = Object.keys(response.data).length;
                                this.conflicts = response.data;

                                for(let i = 0; i < this.conflicts.length; i++){
                                    if(this.conflicts[i].hasOwnProperty('has_conflict')){
                                        if(this.conflicts[i].has_conflict) {
                                            this.numberOfTranslationsToReview++;
                                        }
                                    }
                                }
                            }
                        }, error => {
                            this.$notify({ type: 'error', title: 'Error!', text: 'An error has occured.'});
                        });
                    });
            } else if(this.currentstep === 2){
                return this.$validator.validateAll()
                    .then(result => {
                        if (!result) {
                            this.$notify({ type: 'error', title: 'Error!', text: 'The form contains invalid fields.'});
                            return false;
                        }

                        for(let i = 0; i < this.conflicts.length; i++){
                            if(this.conflicts[i].hasOwnProperty('checkedCurrent')){
                                if(this.conflicts[i].checkedCurrent) {
                                    this.conflicts[i][this.importLanguage.toLowerCase()] = this.conflicts[i].current_value;
                                }
                            }
                        }

                        let url = '/admin/translations/import/conflicts';
                        let data = {
                            importLanguage: this.importLanguage,
                            resolved_translations: this.conflicts
                        };

                        axios.post(url, data).then(response => {
                            this.currentstep = 3;
                            this.numberOfSuccessfullyImportedLanguages = response.data.numberOfImportedTranslations;
                            this.numberOfSuccessfullyUpdatedLanguages = response.data.numberOfUpdatedTranslations;
                            this.loadData();
                        }, error => {
                            this.$notify({ type: 'error', title: 'Error!', text: 'An error has occured.'});
                        });
                    });
            }
        },

        previousStep(){
            this.currentstep--;
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
                        exportLanguage: this.exportLanguage,
                        templateLanguage: this.templateLanguage
                    };
                    let url = '/admin/translations/export?' + $.param(data);
                    this.$modal.hide('edit-translation');
                    window.location = url;
                });
        },
        handleImportFileUpload(e){
            this.file = this.$refs.file.files[0];
            this.importedFile = e.target.files[0];
        }
    }
});
