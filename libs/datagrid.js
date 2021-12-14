
/*
 * Datagrid with paging
 * v1.2.2
 * 
Upute:
- include templatea i css-a:
    
    <script src="datagrid.js"></script>
    <link href="datagrid.css" rel="stylesheet"/>


- add control to vue frontend:    
    <datagrid
        key="datagrid1"
        :source="data_source"
        :columns="data_columns"
        :filter-general-value="filter"
        :filter-general-columns="'column_data_source_names,title,company'"
        :table-class="'myTable'"
        :table-header-class="'header'"
        :show-counter="true"
        :page-size="5"
        :paging-button-count="5"
        :current-page-button-class="'current'"
        :show-all-paging-buttons="false"
        :button-text-first="'&laquo; First'"
        :button-text-last="'Last &raquo;'"
        :show-expand="true"
        :button-expand-text="'Expand'"
        :button-collapse-text="'Collapse'"
        >
    </datagrid>


- register component inside Vue app

    Vue.component('datagrid', dataGrid); // register

- define columns inside Vue app. data = property name containing value, title = column heading

    let data_columns = [
        { data: 'name_source_property', title: 'Name', width: 50, align: 'right', sortable: true },
        { data: 'id_source_property', title: 'Id' },
        { data: 'count_source_property', title: 'Count', sortable: 'number' },
    ];

    For async load, reset in $nextTick:
        this.$nextTick(() => {
            this.$refs.userlist.init();
        });
*/

// https://vuejs.org/v2/guide/components.html
let dataGrid = {
props: {
        source: {
            type: Array,
            default: []
        },
        filterGeneralValue: {
            type: String,
            default: ''
        },
		filterGeneralColumns: {
            type: String,
            default: ''
        },
        columns: Array,
        allowPaging: Boolean,
        showCounter: Boolean,
        showExpand: Boolean,
        showActions: Boolean,
        pageSize: {
            type: Number,
            default: 10
        },
        tableClass: {
            type: String,
            default: ''
        },
        tableHeaderClass: {
            type: String,
            default: ''
        },
        // buttons around current page
        pagingButtonCount: {
            type: Number,
            default: 5
        },
        showAllPagingButtons: {
            type: Boolean,
            default: false
        },
        currentPageButtonClass: {
            type: String,
            default: 'current'
        },
        buttonTextLast: {
            type: String,
            default: 'Last &raquo;'
        },
        buttonTextFirst: {
            type: String,
            default: '&laquo; First'
        },
        buttonExpandText: {
            type: String,
            default: '+'
        },
        buttonCollapseText: {
            type: String,
            default: '-'
        }
    },
    created: function () {
        this.init();
    },
    // from child component just emit the change
    // and let parent handle the change
    mounted: function () {
        //console.log("dataGrid mounted", this.$vnode.key);
        var self = this;
    },
    //beforeDestroy: function() {
    //    //document.removeEventListener('click', )
    //},
    data: function () {
        return {
            filterGeneralColumnsWhitelist: [], // white list for filter,
            currentPage: 1, // 1 based, 1 = first
            expandedRows: [], // list of expanded rows. if we use data attribute vue will not refresh upon change
            sourceModified: [], // after filters and sorting
            currentPageRowsModified: [], // rebuild on expand
            currentPageRows: []
        }
    },
    //beforeUpdate: function () {
    //    this.calculateCurrentPageRowsModified();
    //    console.log('beforeUpdate');
    //}, 
    watch: {
        source: {
            immediate: false,
            handler: function (newV, oldV) {
                this.init();
            }
        },
        filterGeneralValue: {
            immediate: true,
            handler: function (newV, oldV) {
                this.filterSource();
                this.calculateCurrentPageRowsModified();
                this.resetCurrentPage();
            }
        }
    },
    computed: {
        // we have options which need to be displayed as additional column
        columnsModified: function () {
            //if (this.showExpand)
            //    this.columns.unshift({ data: '__expand__', title: '' });
            //if (this.showCounter)
            //    this.columns.unshift({ data: '__counter__', title: '' });
            return this.columns;
        },
        totalPages: function () {
            //this.currentPage = 1; // reset on page count change
            if (!this.sourceModified) return 0;
            if (!Number.isInteger(this.pageSize)) this.pageSize = 10;
            return Math.ceil(this.totalRows / this.pageSize);
        },
        totalRows: function () {
            return this.sourceModified.length;
        },
        currentPageFirstItemNo: function () {
            return (this.currentPage - 1) * this.pageSize + 1;
        },
        currentPageLastItemNo: function () {
            return Math.min(this.currentPage * this.pageSize, this.totalRows);
        },
        pagingButtons: function () {
            if (this.totalRows == 0)
                return [];
            let buttons = [];
            if (this.showAllPagingButtons || this.totalPages <= 5) {
                // show all buttons
                for (let i = 1, j = this.totalPages; i <= j; i++) {
                    buttons.push({ text: i, page: i });
                }
            } else {
                // format   Previous 1 … 567 … 92 Next
                let offset = Math.floor(this.pagingButtonCount / 2); // buttons on each side
                if (this.currentPage - offset <= 1) {
                    // beginning
                    for (let i = 1, j = Math.min(this.totalPages, this.pagingButtonCount); i <= j; i++) {
                        buttons.push({ text: i, page: i });
                    }
                    buttons.push({ text: this.buttonTextLast, page: this.totalPages });
                } else if (this.currentPage + offset >= this.totalPages) {
                    // currentPage in last pagingButtonCount
                    buttons.push({ text: this.buttonTextFirst, page: 1 });
                    for (let i = (Math.max(this.pagingButtonCount, this.totalPages) - this.pagingButtonCount + 1); i <= this.totalPages; i++) {
                        buttons.push({ text: i, page: i });
                    }
                } else {
                    // midle, buttons around current page
                    buttons.push({ text: this.buttonTextFirst, page: 1 });
                    let start = this.currentPage - Math.floor(this.pagingButtonCount / 2);
                    for (let i = start, j = start + this.pagingButtonCount; i < j; i++) {
                        buttons.push({ text: i, page: i });
                    }
                    buttons.push({ text: this.buttonTextLast, page: this.totalPages });
                }

            }

            return buttons;
        }
    },
    methods: {
        init: function(data){
            //console.log('init source', this.source.length)
            if (this.filterGeneralColumns){
			    this.filterGeneralColumnsWhitelist = this.filterGeneralColumns.split(',');
		    }
            this.filterSource();
            //console.log(`source.length %s, totalPages %s`, this.source.length, this.totalPages, data);
            
            for (let i = 0, j = this.source.length; i < j; i++) {
                let curr = this.source[i];
                curr['__index__'] = i;
                //curr['__expand__'] = false;
            }
            this.calculateCurrentPageRowsModified();
            this.resetCurrentPage();
        },
        filterSource: function(){
            if (this.filterGeneralValue) {
                let self = this;
                let filter = this.filterGeneralValue.toLowerCase();
                let whitelistLength = this.filterGeneralColumnsWhitelist.length;
                this.sourceModified = this.source.filter(x => {
                    for(let i=0; i<whitelistLength; i++){
                        if ((x[self.filterGeneralColumnsWhitelist[i]] || '').toString().toLowerCase().includes(filter))
                            return true;
                    }
                });
            } else {
                this.sourceModified = this.source;
            }
        },
        resetCurrentPage: function () {
            this.currentPage = 1; // reset on page count change
        },
        refreshCurrentPageRows: function () {
            var start = (this.currentPage - 1) * this.pageSize;
            var end = start + this.pageSize;
            this.currentPageRows = this.sourceModified.slice(start, end);
        },
        // for expand function, clone current page and insert expanded rows
        calculateCurrentPageRowsModified: function () {
            this.refreshCurrentPageRows();
            let pageRows = this.currentPageRows;
            this.currentPageRowsModified = [];
            //console.log("pageRows", pageRows);
            //for (let i = pageRows.length - 1; i > 0; i--) {
            for (let i =0, j = pageRows.length; i < j; i++) {
                let curr = pageRows[i];
                this.currentPageRowsModified.push(curr);

                //if (curr.type && curr.type == 'details') continue;
                let totalIndex = curr['__index__'];//this.getTotalIndex(i);
                if (this.expandedRows.indexOf(totalIndex) > -1) {
                    this.currentPageRowsModified.push({ '__index__': totalIndex + 'd', type: 'details', rowdata: curr });
                }

                //curr['__expand__'] = false;
                //if (curr['__expand__'] == true) {
                //    pageRows.splice(i, 0, [{ sourceModified: curr }]);
                //}
            }
        },
        getColumnValue: function (row, colData, i) {
            //if (colData == '__counter__') {
            //    return (this.currentPage - 1) * this.pageSize + i + 1;
            //} else if (colData == '__expand__') {
            //    // ignore
            //    return null;
            //}
            return row[colData] || '';
        },
        changePage: function (page) {
            this.currentPage = page;
            this.calculateCurrentPageRowsModified();
        },
        getTotalIndex: function (currentPageIndex) {
            return currentPageIndex + (this.pageSize * (this.currentPage - 1));
        },
        expandRowToggle: function (row, ti) {
            let ix = this.expandedRows.indexOf(ti);
            var isExpanded = ix > -1;
            if (isExpanded)
                this.expandedRows.splice(ix, 1);
            else
                this.expandedRows.push(ti);
            row.expanded = !isExpanded;
            this.calculateCurrentPageRowsModified();
            //console.log(row, totalIndex);
            //this.sourceModified[totalIndex]['__expand__'] = true;
            //vm.$forceUpdate();
        },
        sortAsc: function (column) {
            column.sorted = "ASC";
            let page = this.currentPage;
            this.sourceModified.sort(this.dynamicSort(column.data, column.sortable));
            this.calculateCurrentPageRowsModified();
            //this.changePage(page);
        },
        sortDesc: function (column) {
            column.sorted = "DESC";
            let page = this.currentPage;
            this.sourceModified.sort(this.dynamicSort("-" + column.data, column.sortable));
            this.calculateCurrentPageRowsModified();
            //this.changePage(page);
        },
        sortToggle: function (column){
            if (column.sorted == 'ASC' || column.sorted == 'undefined'){
                this.sortDesc(column);
            } else {
                this.sortAsc(column);
            }
        },
        // https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
        dynamicSort: function(property, type) {
            var sortOrder = 1;
            if (property[0] === "-") {
                sortOrder = -1;
                property = property.substr(1);
            }
            if (type == 'number') {
                return function (a, b) {
                    let av = parseFloat(a[property]) || 0;
                    let bv = parseFloat(b[property]) || 0;
                    //var result = (parseFloat(a[property]) || 0 < parseFloat(b[property]) || 0) ? -1 : (parseFloat(a[property] || 0) > parseFloat(b[property]) || 0) ? 1 : 0;
                    var result = (av < bv) ? -1 : (av > bv) ? 1 : 0;
                    return result * sortOrder;
                }
            } else {
                return function (a, b) {
                    //var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
                    var result = a[property].localeCompare(b[property]);
                    return result * sortOrder;
                }
            }
        }
    },

    template: `    
	<div class="datagrid_container">
        <table :class="['datagrid_table', tableClass]">
            <thead>
                <tr :class="tableHeaderClass" valign="middle">
                    <th v-if="showCounter"><!-- counter column title --></th>
                    <th v-for="(col, index) in columnsModified" :class="[{'sortable': col.sortable}]" :style="[{'width': col.width ? col.width +'px' : 'auto'},{'text-align': col.align ? col.align : 'inherit'}]" :key="index">
                        {{ col.title }}
                        <span class="sort-asc" :class="{'active': col.sorted == 'DESC'}" v-if="col.sortable" @click="sortToggle(col)"></span>
                        <span class="sort-desc" :class="{'active': col.sorted == 'ASC' || col.sorted == undefined}"  v-if="col.sortable" @click="sortToggle(col)"></span>
                    </th>
                    <th v-if="showExpand"><!-- expand column title --></th>
                    <th v-if="showActions"><!-- actions column title --></th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(row, rowIndex) in currentPageRowsModified" :key="row.__index__" :class="[row.expanded ? 'expanded' : '', row.type == 'details' ? 'details' : '']">
                    <template v-if="row.type == 'details'">
                        <td :colspan="columns.length + (showExpand ? 1 : 0) + (showCounter ? 1 : 0) + (showActions ? 1 : 0)">
                            <slot name="details" v-bind="row"></slot>
                        </td>
                    </template>
                    <template v-else>
                        <td v-if="showCounter" class="counter">{{row["__index__"] + 1}}</td>
                        <td v-for="col in columns" :style="{'text-align': col.align ? col.align : 'inherit'}" :key="col.data"><slot :name="col.data" v-bind="row">{{ getColumnValue(row, col.data, rowIndex) }}</slot></td>
                        <td v-if="showExpand" class="expand_collapse">
                            <span class="expand_collapse" @click="expandRowToggle(row, row.__index__)">{{row.expanded ? buttonCollapseText : buttonExpandText}}</span>
                        </td>
                        <td v-if="showActions" class="actions">
                            <slot name="actions" v-bind="row"></slot>
                        </td>
                    </template>
                </tr>
            </tbody>
        </table>
        <div :class="['datagrid_info']">
            <span>Page {{currentPage}} of {{totalPages}}.</span>
            <span style="padding-left: 5px;">Showing records {{currentPageFirstItemNo}} - {{currentPageLastItemNo}} out of {{totalRows}}.</span>
        </div>
        <div :class="['datagrid_paging']" v-show="totalPages > 1">
            <template v-for="(button, index) in pagingButtons">
                <button :key="index" type="button" @click="changePage(button.page)" :class="['btn', currentPage == button.page ? currentPageButtonClass : '']" v-html="button.text"></button>
            </template>
        </div>
    </div>
`
};

