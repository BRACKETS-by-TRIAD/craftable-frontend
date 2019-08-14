import moment from 'moment';
import 'moment-timezone';
import Pagination from './components/Pagination';
import Sortable from './components/Sortable';
import { VTooltip, VPopover, VClosePopover } from 'v-tooltip';
import UserDetailTooltip from './components/UserDetailTooltip';

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
        }
    },
    props: {
        'url': {
           type: String,
           required: true
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

    created: function() {
        if (this.data != null){
            this.populateCurrentStateAndData(this.data);
        } else {
            this.loadData();
        }

        var _this = this;
        setInterval(function(){
            _this.now = moment().tz(_this.timezone).format('YYYY-MM-DD HH:mm:ss');
        }, 1000);
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

        loadData (resetCurrentPage) {
            let options = {
                params: {
                    per_page: this.pagination.state.per_page,
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
        },

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

        setPublishingDates: function publishLater(url,row) {
            var _this = this;
            var dialogType = 'setPublishingDatesDialog';

            this.$modal.show({
                template: `
                    <div class="vue-dialog setPublishingDatesDialog">
                        <div class="card-body">
                            <p>{{ trans.text }}</p>
                            <div class="form-group row align-items-start">
                                <div class="col">
                                    <label>{{ trans.from }}</label>
                                    <datetime 
                                        ref="published_at" 
                                        v-model="mutablePublishedAt"
                                        :config="datetimePickerConfig" 
                                        v-validate="'date_format:yyyy-MM-dd HH:mm:ss'" 
                                        class="flatpickr" 
                                        >
                                    </datetime>
                                </div>
                                <div class="col">
                                    <label>{{ trans.to }}</label>
                                    <datetime 
                                        v-model="mutablePublishedTo"
                                        :config="datetimePickerConfig" 
                                        v-validate="'date_format:yyyy-MM-dd HH:mm:ss|after:published_at'"
                                        class="flatpickr" 
                                        >
                                    </datetime>
                                </div>
                            </div>
                            <div class="row offset-md-3 col-md-6">


                                <div class="col col-md-6">
                                    <button class="col btn btn-secondary" @click="$emit('close')">{{trans.no}}</button>                            
                                </div>
                                <div class="col col-md-6">
                                    <button class="col btn btn-success" type="button" @click="save(mutablePublishedAt,mutablePublishedTo)">{{trans.yes}}</button>
                                </div>
                            </div>
                        </div>                
                    </div>                
                `,
                props: ['trans', 'published_at', 'published_to', 'datetimePickerConfig', 'save'],
                data() {
                    return {
                        mutablePublishedAt: row.published_at,
                        mutablePublishedTo: row.published_to
                    }
                },
            }, {
                published_at: row.published_at,
                published_to: row.published_to,
                datetimePickerConfig: _this.datetimePickerConfig,
                trans: _this.trans[dialogType],
                save: function save(mutablePublishedAt, mutablePublishedTo){
                    _this.$modal.hide('SetPublishingDatesDialog');

                    axios.post(url, { published_at: mutablePublishedAt, published_to: mutablePublishedTo }).then(function (response) {
                        row.published_at = response.data.object.published_at;
                        row.published_to = response.data.object.published_to;
                        _this.$notify({ type: 'success', title: 'Success!', text: response.data.message ? response.data.message : _this.trans[dialogType].success });
                    }, function (error) {

                        _this.$notify({ type: 'error', title: 'Error!', text: error.response.data.message ? error.response.data.message : _this.trans[dialogType].error });
                    });
                },

            }, {
                width: 700,
                height: 'auto',
                name: 'SetPublishingDatesDialog'
            });
        },
    }

};