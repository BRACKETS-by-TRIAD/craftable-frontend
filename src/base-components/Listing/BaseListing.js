import moment from 'moment';
import Pagination from './components/Pagination';
import Sortable from './components/Sortable';
import { VTooltip, VPopover, VClosePopover } from 'v-tooltip';
import UserDetailTooltip from './components/UserDetailTooltip';
import {pickBy, keys} from 'lodash';

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
              this.dummy = Math.random();
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
            let itemsInPaginationIds = Object.values(this.collection).map(({id}) => id);

            //for loop is used because you can't return false in .forEach() method
            for(let i = 0; i < itemsInPaginationIds.length; i++){
                let itemInPaginationId = itemsInPaginationIds[i];
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
            let options = {
                params: {
                    bulk: true
                }
            };

            this.bulkCheckingAllLoader = true;
            Object.assign(options.params, this.filters);

            axios.get('/admin/articles', options).then(response => {
                this.checkAllItems(response.data.bulkItems);
            }, error => {
                this.$notify({ type: 'error', title: 'Error!', text: error.response.data.message ? error.response.data.message : 'An error has occured.'});
            }).finally(() => {
                this.bulkCheckingAllLoader = false;
            });
        },

        onBulkItemsClickedAllWithPagination() {
            let itemsInPagination = Object.values(this.collection).map(({id}) => id);
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