import moment from 'moment';
import Pagination from './components/Pagination';
import Sortable from './components/Sortable';
import { VTooltip, VPopover, VClosePopover } from 'v-tooltip';
import UserDetailTooltip from './components/UserDetailTooltip';
import {pickBy} from "lodash";
import {keys} from "lodash";


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
            bulkItems: {},
            isClickedAll: false,
            bulkCheckingAll: false
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
       }
    },
    components: {
       'pagination': Pagination,
       'sortable': Sortable,
       'user-detail-tooltip': UserDetailTooltip
    },

    watch: {
      pagination: {
          handler: function () {
              this.checkIfClickedAll();
          },
          deep: true
      }
    },

    created: function() {
        if (this.data != null){
            this.populateCurrentStateAndData(this.data);
        } else {
            this.loadData();
        }
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
        onBulkItemClicked(id) {
            this.bulkItems[id] === undefined ? Vue.set(this.bulkItems, id, true) : this.bulkItems[id] = !this.bulkItems[id];
            this.checkIfClickedAll();
        },

        checkIfClickedAll() {
            this.isClickedAll = (this.clickedBulkItemsCount() >= this.pagination.state.total) && (this.clickedBulkItemsCount() > 0);
        },

        clickedBulkItemsCount() {
            return Object.values(this.bulkItems).filter(function (item) {
                return item === true;
            }).length;
        },

        onBulkItemsClickedAll(url) {
            this.isClickedAll = !this.isClickedAll;

            if(this.isClickedAll){
                let options = {
                    params: {
                        bulk: true
                    }
                };

                this.bulkCheckingAll = true;
                Object.assign(options.params, this.filters);

                axios.get(url, options).then(response => {
                    this.checkAllItems(response.data.bulkItems);
                    this.bulkCheckingAll = false;
                }, error => {
                    this.$notify({ type: 'error', title: 'Error!', text: error.response.data.message ? error.response.data.message : 'An error has occured.'});
                });
            } else {
                this.onBulkItemsClickedAllUncheck();
            }
        },

        checkAllItems(itemsToCheck) {
            itemsToCheck.forEach((itemId) => {
                Vue.set(this.bulkItems, itemId, true);
            });
        },

        onBulkItemsClickedAllUncheck() {
            this.isClickedAll = false;
            this.bulkItems = {};
        },

        bulkDelete(url) {
            let itemsToDelete = keys(pickBy(this.bulkItems));
            let self = this;

            this.$modal.show('dialog', {
                title: 'Warning!',
                text: `Do you really want to delete ${this.clickedBulkItemsCount()} selected items ?`,
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
                                this.isClickedAll = false;
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
        }
    }

};