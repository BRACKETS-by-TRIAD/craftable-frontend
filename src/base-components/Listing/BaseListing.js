import moment from 'moment';
import 'moment-timezone';
import Pagination from './components/Pagination';
import Sortable from './components/Sortable';
import { VTooltip, VPopover, VClosePopover } from 'v-tooltip';
import UserDetailTooltip from './components/UserDetailTooltip';
import {pickBy, keys, map} from 'lodash';
const qs = require('qs');

Vue.directive('tooltip', VTooltip);
Vue.directive('close-popover', VClosePopover);
Vue.component('v-popover', VPopover);

export default {
    data: function() {
        return {
            pagination : {
                state: {
                    per_page: this.$cookie.get('per_page') || 10,    // required
                    current_page: 1, // required
                    last_page: 1,    // required
                    from: 1,
                    to: 10           // required
                },
                options: {
                    alwaysShowPrevNext: true
                },
            },
            orderBy: {
                column: 'id',
                direction: 'asc',
            },
            filters: {},
            search: '',
            collection: null,
            now: moment().tz(this.timezone).format('YYYY-MM-DD HH:mm:ss'),
            datetimePickerConfig: {
                enableTime: true,
                time_24hr: true,
                enableSeconds: true,
                dateFormat: 'Y-m-d H:i:S',
                altInput: true,
                altFormat: 'd.m.Y H:i:S',
                locale: null,
                inline: true
            },
            bulkItems : {},
            bulkCheckingAllLoader: false,
            dummy: null
        }
    },
    props: {
        'url': {
           type: String,
           required: true
        },
        'dynamicUrl': {
            type: Boolean,
            required: false,
            default: function() {
                return false;
            }
        },
        'data': {
           type: Object,
           default: function() {
               return null;
           }
        },
        'timezone': {
            type: String,
            required: false,
            default: function() {
                return "UTC";
            }
        },
        'trans': {
            required: false,
            default: function _default() {
                return {
                    duplicateDialog: {
                        title: 'Warning!',
                        text: 'Do you really want to duplicate this item?',
                        yes: 'Yes, duplicate.',
                        no: 'No, cancel.',
                        success_title: 'Success!',
                        success: 'Item successfully duplicated.',
                        error_title: 'Error!',
                        error: 'An error has occured.',
                    },
                    deleteDialog: {
                        title: 'Warning!',
                        text: 'Do you really want to delete this item?',
                        yes: 'Yes, delete.',
                        no: 'No, cancel.',
                        success_title: 'Success!',
                        success: 'Item successfully deleted.',
                        error_title: 'Error!',
                        error: 'An error has occured.',
                    }
                };

            }
        },
    },
    components: {
       'pagination': Pagination,
       'sortable': Sortable,
       'user-detail-tooltip': UserDetailTooltip
    },

    watch: {
      pagination: {
          handler: function () {
              this.dummy = Math.random();
          },
          deep: true
      }
    },

    created: function() {
        if (this.data != null){
            this.populateCurrentStateAndData(this.data);
            this.setParamsFromUrl(false); // set filters&ordering from url (pagination is updated in populateCurrentStateAndData)
        } else {
            this.setParamsFromUrl();
            this.loadData();
        }

        var _this = this;
        setInterval(function(){
            _this.now = moment().tz(_this.timezone).format('YYYY-MM-DD HH:mm:ss');
        }, 1000);

        this.updateFiltersInChildComponents(this.filters);

        window.onpopstate = function(event) {
            if(_this.dynamicUrl) {
                _this.setParamsFromUrl();
                _this.loadData(false, false);
                _this.updateFiltersInChildComponents(_this.filters);
            }
        };
    },

    computed: {
        isClickedAll: {
            get() {
                const dummy = this.dummy; //we hack pagination watcher don't recalculate computed property
                return (this.clickedBulkItemsCount >= ((this.pagination.state.to - this.pagination.state.from) + 1)) && (this.clickedBulkItemsCount > 0) && (this.allClickedItemsAreSame());
            },
            set(clicked) {}
        },
        clickedBulkItemsCount() {
            return Object.values(this.bulkItems).filter((item) => {
                return item === true;
            }).length;
        },
    },

    filters: {
        date: function (date, format = 'YYYY-MM-DD') {
            var date = moment(date);
            return date.isValid() ? date.format(format) : "";
        },
        datetime: function (datetime, format = 'YYYY-MM-DD HH:mm:ss') {
            var date = moment(datetime);
            return date.isValid() ? date.format(format) : "";
        },
        time: function (time, format = 'HH:mm:ss') {
            // '2000-01-01' is here just because momentjs needs a date
            var date = moment('2000-01-01 ' + time);
            return date.isValid() ? date.format(format) : "";
        }
    },

    methods: {
        allClickedItemsAreSame() {
            const itemsInPaginationIds = Object.values(this.collection).map(({id}) => id);

            //for loop is used because you can't return false in .forEach() method
            for(let i = 0; i < itemsInPaginationIds.length; i++){
                const itemInPaginationId = itemsInPaginationIds[i];
                if((this.bulkItems[itemInPaginationId] === undefined) || (this.bulkItems[itemInPaginationId] === false)){
                    return false;
                }
            }

            return true;
        },

        onBulkItemClicked(id) {
            this.bulkItems[id] === undefined ? Vue.set(this.bulkItems, id, true) : this.bulkItems[id] = !this.bulkItems[id];
        },

        onBulkItemsClickedAll(url) {
            const options = {
                params: {
                    bulk: true
                }
            };

            this.bulkCheckingAllLoader = true;
            Object.assign(options.params, this.filters);

            axios.get(url, options).then(response => {
                this.checkAllItems(response.data.bulkItems);
            }, error => {
                this.$notify({ type: 'error', title: 'Error!', text: error.response.data.message ? error.response.data.message : 'An error has occured.'});
            }).finally(() => {
                this.bulkCheckingAllLoader = false;
            });
        },

        onBulkItemsClickedAllWithPagination() {
            const itemsInPagination = Object.values(this.collection).map(({id}) => id);
            if(!this.isClickedAll) {
                this.bulkCheckingAllLoader = true;
                this.checkAllItems(itemsInPagination);
                this.bulkCheckingAllLoader = false;
            } else {
                this.onBulkItemsClickedAllUncheck(itemsInPagination);
            }
        },

        checkAllItems(itemsToCheck) {
            itemsToCheck.forEach((itemId) => {
                Vue.set(this.bulkItems, itemId, true);
            });
        },

        onBulkItemsClickedAllUncheck(bulkItemsToUncheck = null) {
            if(bulkItemsToUncheck === null){
                this.bulkItems = {};
            } else {
                Object.values(this.collection).map(({id}) => id).forEach((itemsInPaginationIds) => {
                    this.bulkItems[itemsInPaginationIds] = false;
                });
            }
        },

        bulkDelete(url) {
            const itemsToDelete = keys(pickBy(this.bulkItems));
            const self = this;

            this.$modal.show('dialog', {
                title: 'Warning!',
                text: `Do you really want to delete ${this.clickedBulkItemsCount} selected items ?`,
                buttons: [
                    { title: 'No, cancel.' },
                    {
                        title: '<span class="btn-dialog btn-danger">Yes, delete.<span>',
                        handler: () => {
                            this.$modal.hide('dialog');
                            axios.post(url, {
                                data: {
                                    'ids': itemsToDelete
                                }
                            }).then(response => {
                                self.bulkItems = {};
                                this.loadData();
                                this.$notify({ type: 'success', title: 'Success!', text: response.data.message ? response.data.message : 'Item successfully deleted.'});
                            }, error => {
                                this.$notify({ type: 'error', title: 'Error!', text: error.response.data.message ? error.response.data.message : 'An error has occured.'});
                            });
                        }
                    }
                ]
            });
        },

        loadData (resetCurrentPage, updateUrl = true) {
            let options = {
                params: {
                    per_page: this.pagination.state.per_page || 10,
                    page: this.pagination.state.current_page,
                    orderBy: this.orderBy.column,
                    orderDirection: this.orderBy.direction,
                }
            };

            if (resetCurrentPage === true) {
                options.params.page = 1;
            }

            Object.assign(options.params, this.filters);

            axios.get(this.url, options).then(response => this.populateCurrentStateAndData(response.data.data), error => {
                // TODO handle error
            });

            if(updateUrl) {
                this.updateUrl(options.params);
            }
        },

        //FIXME: filter can be called by child listing components on create to set default filters
        filter(column, value) {
            if (value == '') {
                delete this.filters[column];
            } else {
                this.filters[column] = value;
            }
            // when we change filter, we must reset pagination, because the total items count may has changed
 
            this.loadData(true);
        },

        populateCurrentStateAndData(object) {

            if (object.current_page > object.last_page && object.total > 0) {
                this.pagination.state.current_page = object.last_page;
                this.loadData();
                return ;
            }
            
            this.collection = object.data;
            this.pagination.state.current_page = object.current_page;
            this.pagination.state.last_page = object.last_page;
            this.pagination.state.total = object.total;
            this.pagination.state.per_page = object.per_page;
            this.pagination.state.to = object.to;
            this.pagination.state.from = object.from;
        },

        updateUrl(params) {
            if (window.history.pushState && this.dynamicUrl) { 
                const url = `${this.url}?${qs.stringify(params, {skipNulls: true})}`;
                window.history.pushState(params, 'Page', url);
            }
        },

        setParamsFromUrl(updatePagination = true) {
            if(!this.dynamicUrl) {
                return;
            }

            const params = qs.parse(location.search, { ignoreQueryPrefix: true });

            // populate pagination data
            if(updatePagination) {
                this.pagination.state.current_page = params.page ? parseInt(params.page) : 1;
                this.pagination.state.per_page = params.per_page ? parseInt(params.per_page) : 10;
            }

            // populate ordering data
            this.orderBy.column = params.orderBy ? params.orderBy : 'id';
            this.orderBy.direction = params.orderDirection ? params.orderDirection : 'asc';

            // populate filter data
            map(this.filters, (filter, key) => {
                if(params[key]) {
                    this.filters[key] = params[key];
                } else {
                    this.filters[key] = this.getDefaultEmptyValue(this.filters[key])
                }
            });

            // populate the search field
            if(params.search) {
                this.search = params.search;
                this.filters['search'] = params.search
            }
        },

        getDefaultEmptyValue(variable) {
            if(variable === null) {
                return null;
            }

            if(typeof variable === 'object') {
                if(variable.constructor.name === 'Array') {
                    return [];
                }

                return {};
            } 

            if(typeof variable === 'boolean') {
                return false;
            }

            return null;
        },

        updateFiltersInChildComponents(filters) {
            // function for child components to implement
        },

        deleteItem(url){
            this.$modal.show('dialog', {
                title: 'Warning!',
                text: 'Do you really want to delete this item?',
                buttons: [
                    { title: 'No, cancel.' },
                    {
                        title: '<span class="btn-dialog btn-danger">Yes, delete.<span>',
                        handler: () => {
                            this.$modal.hide('dialog');
                            axios.delete(url).then(response => {
                                this.loadData();
                                this.$notify({ type: 'success', title: 'Success!', text: response.data.message ? response.data.message : 'Item successfully deleted.'});
                            }, error => {
                                this.$notify({ type: 'error', title: 'Error!', text: error.response.data.message ? error.response.data.message : 'An error has occured.'});
                            });
                        }
                    }
                ]
            });
        },

        toggleSwitch(url, col, row){
            axios.post(url, row).then(response => {
                this.$notify({ type: 'success', title: 'Success!', text: response.data.message ? response.data.message : 'Item successfully changed.'});
            }, error => {
                row[col] = !row[col];
                this.$notify({ type: 'error', title: 'Error!', text: error.response.data.message ? error.response.data.message : 'An error has occured.'});
            });
        },

        publishNow: function publishNow(url,row,dialogType) {
            var _this = this;
            if (!dialogType) dialogType = 'publishNowDialog';

            this.$modal.show('dialog', {
                title: _this.trans[dialogType].title,
                text: _this.trans[dialogType].text,
                buttons: [{ title: _this.trans[dialogType].no }, {
                    title: '<span class="btn-dialog btn-success">'+_this.trans[dialogType].yes+'<span>',
                    handler: function handler() {
                        _this.$modal.hide('dialog');

                        axios.post(url, { publish_now: true }).then(function (response) {
                            row.published_at = response.data.object.published_at;
                            _this.$notify({ type: 'success', title: 'Success!', text: response.data.message ? response.data.message : _this.trans[dialogType].success });
                        }, function (error) {

                            _this.$notify({ type: 'error', title: 'Error!', text: error.response.data.message ? error.response.data.message : _this.trans[dialogType].error });
                        });
                    }
                }]
            });
        },

        unpublishNow: function unpublishNow(url,row,additionalWarning) {
            var _this = this;
            var dialogType = 'unpublishNowDialog';

            this.$modal.show('dialog', {
                title: _this.trans[dialogType].title,
                text: _this.trans[dialogType].text+(additionalWarning ? '<br /><span class="text-danger">'+additionalWarning+'</span>' : ''),
                buttons: [{ title: _this.trans[dialogType].no }, {
                    title: '<span class="btn-dialog btn-danger">'+_this.trans[dialogType].yes+'<span>',
                    handler: function handler() {
                        _this.$modal.hide('dialog');

                        axios.post(url, { unpublish_now: true }).then(function (response) {
                            row.published_at = response.data.object.published_at;
                            row.published_to = response.data.object.published_to;
                            _this.$notify({ type: 'success', title: 'Success!', text: response.data.message ? response.data.message : _this.trans[dialogType].success });
                        }, function (error) {

                            _this.$notify({ type: 'error', title: 'Error!', text: error.response.data.message ? error.response.data.message : _this.trans[dialogType].error });
                        });
                    }
                }]
            });
        },

        publishLater: function publishLater(url,row,dialogType) {
            var _this = this;
            if (!dialogType) dialogType = 'publishLaterDialog';

            this.$modal.show({
                template: `
                    <div class="vue-dialog">
                        <div class="card-body">
                            <p>{{ trans.text }}</p>
                            <div class="form-group row align-items-center">
                                <div class="col">
                                    <datetime 
                                        
                                        v-model="mutablePublishedAt"
                                        :config="datetimePickerConfig" 
                                        v-validate="'date_format:yyyy-MM-dd HH:mm:ss'" 
                                        class="flatpickr" 
                                        >
                                    </datetime>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col">
                                    <button class="col btn btn-secondary" @click="$emit('close')">{{trans.no}}</button>                            
                                </div>
                                <div class="col">
                                    <button class="col btn btn-success" type="button" @click="save(mutablePublishedAt)">{{trans.yes}}</button>
                                </div>
                            </div>
                        </div>                
                    </div>                
                `,
                props: ['trans', 'published_at', 'datetimePickerConfig', 'save'],
                data() {
                    return {
                        mutablePublishedAt: row.published_at
                    }
                },
            }, {
                published_at: row.published_at,
                datetimePickerConfig: _this.datetimePickerConfig,
                trans: _this.trans[dialogType],
                save: function save(mutablePublishedAt){
                    _this.$modal.hide('PublishLaterDialog');

                    axios.post(url, { published_at: mutablePublishedAt }).then(function (response) {
                        row.published_at = response.data.object.published_at;
                        _this.$notify({ type: 'success', title: 'Success!', text: response.data.message ? response.data.message : _this.trans[dialogType].success });
                    }, function (error) {

                        _this.$notify({ type: 'error', title: 'Error!', text: error.response.data.message ? error.response.data.message : _this.trans[dialogType].error });
                    });
                },

            }, {
                width: 350,
                height: 'auto',
                name: 'PublishLaterDialog'
            });
        },
    }

};