
/*
 * Datagrid with paging
 * v1.2.2.10
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
        :filter-general-columns="'column_data_source_names,title,company'"
        :table-class="'myTable'"
        :table-header-class="'header'"
        :show-counter="true"
        :page-size="5"
        :page-size-options="[5,10,25]"
        :page-size-options-show-all="true"
        :paging-button-count="5"
        :current-page-button-class="'current'"
        :show-all-paging-buttons="false"
        :button-text-first="'&laquo; First'"
        :button-text-last="'Last &raquo;'"
        :show-expand="true"
        :button-expand-text="'Expand'"
        :button-collapse-text="'Collapse'"
        :show-export="true"
        export-filename="table"
        >
        <template v-slot:field_property="row">
            Custom value display
            <span :title="row.periodSecondsTotal + ' seconds'">{{formatTime(getPeriodsFromSeconds(row .periodSecondsTotal))}}</span>
        </template>
        <template v-slot:actions="row">
            <button class="button reveal danger-btn" type="button" @click="removeItem(row)">Delete</button>
        </template>
    </datagrid>


- register component inside Vue app

    Vue.component('datagrid', dataGrid); // register

- define columns inside Vue app. data = property name containing value, title = column heading

    let data_columns = [
        { data: 'name_source_property', showColumnFilter: true, title: 'Name', width: 50, align: 'right', sortable: true },
        { data: 'id_source_property', title: 'Id' },
        { data: 'count_source_property', title: 'Count', sortable: 'number' },
        { data: 'date_source_property', title: 'Date', sortable: 'number', sortingFunction: function(a,b){
                return a.epoch - b.epoch;
        }}
    ];

    For async load, reset in $nextTick:
        this.$nextTick(() => {
            this.$refs.userlist.init();
        });

- find and highlight record:
    findAndHighlight: function(){
        let findfunc = function(data){
            return data.find(x => x.akronim == 'GIB');
        }
        this.$refs.datagrid1.findAndHighlight(findfunc);
    }
*/

// https://vuejs.org/v2/guide/components.html
let dataGrid = {
props: {
        source: {
            type: Array,
            default: []
        },
        // filterGeneralValue: {
        //     type: String,
        //     default: ''
        // },
		filterGeneralColumns: {
            type: String,
            default: ''
        },
        columns: Array,
        allowPaging: Boolean,
        showCounter: Boolean,
        showExpand: Boolean,
        showActions: Boolean,
        pageSizeDefault: {
            type: Number,
            default: 10
        },
        pageSizeOptions: {
            type: Array,
            default: () => [10, 25, 50]
        },
        pageSizeOptionsShowAll: {
            type: Boolean,
            default: false
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
        },
        showExport: {
            type: Boolean,
            default: false
        },
        exportFilename: {
            type: String,
            default: 'datagrid_export'
        },
        isLoading: {
            type: Boolean,
            default: false
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
            filterGeneralValue: '',
            filterGeneralColumnsWhitelist: [], // white list for filter,
            currentPage: 1, // 1 based, 1 = first
            expandedRows: [], // list of expanded rows. if we use data attribute vue will not refresh upon change
            sourceModified: [], // after filters and sorting
            currentPageRowsModified: [], // rebuild on expand
            currentPageRows: [],
            selectedPageSize: this.pageSizeDefault, // separate from pagesize for handling 'all' case and preselection in options list
            pageSize: null,
            exportFormat: 'csv',
            highlightRowNo: null,
            columnFilters: null // {options: [], value}
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
                if (!this.source) return;
                this.filterSource();
                this.calculateCurrentPageRowsModified();
                this.resetCurrentPage();
            }
        },
        selectedPageSize: {
            immediate: true,
            handler: function(newV){
                if (newV == 'all'){
                    this.pageSize = (this.sourceModified || []).length;
                } else {
                    this.pageSize = newV;
                }
                this.currentPage = 1;
                this.calculateCurrentPageRowsModified();
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
            //if (!Number.isInteger(this.pageSize)) this.pageSize = 10;
            return Math.ceil(this.totalRows / this.pageSize);
        },
        totalRows: function () {
            return (this.sourceModified || []).length;
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
            if (!this.source) return;
            if (!Array.isArray(this.source)) {
                throw new Error('DataGrid error: source is not an array!');
            }
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
            let self = this;
            // build column filters if requested
            this.columns.forEach(c => { 
                if (c.showColumnFilter){
                    if (!self.columnFilters)
                        self.columnFilters = {};
                    let unique = [...new Set(this.source.map(r => r[c.data]))];
                    self.columnFilters[c.data] = {
                        options: unique,
                        value: null
                    }
                }
            });
        },
        findAndHighlight: function(findfunc){
            if (typeof(findfunc) != 'function') return;
            let row = findfunc(this.sourceModified);
            let newPage = Math.floor(row.__index__ /this.pageSize);
            this.changePage(newPage + 1);
            this.highlightRowNo = row.__index__;
        },
        // general search
        filterSource: function(){
            this.sourceModified = [];
            // general search
            let source_ = this.source;
            if (this.filterGeneralValue) {
                let self = this;
                let filter = this.filterGeneralValue.toLowerCase();
                let whitelistLength = this.filterGeneralColumnsWhitelist.length;
                source_ = source_.filter(x => {
                    for(let i=0; i<whitelistLength; i++){
                        if ((x[self.filterGeneralColumnsWhitelist[i]] || '').toString().toLowerCase().includes(filter))
                            return true;
                    }
                });
            }
            // columns filter
            if (this.columnFilters){
                Object.keys(this.columnFilters).forEach(key => {
                    let filter = this.columnFilters[key];
                    if (filter.value){
                        source_ = source_.filter(x => {
                            return x[key] == filter.value;
                        })
                    }
                })
            }
            this.sourceModified = source_;
        },
        // column filter change
        columnFilterChange: function(columnName){
            this.filterSource(); // reset
                            this.calculateCurrentPageRowsModified();
                this.resetCurrentPage();
            // //console.log('columnFilterChange', columnName, this.columnFilters);
            // let value = this.columnFilters[columnName].value;
            // Vue.$set(this.sourceModified,  this.sourceModified.filter(x => {
            //     console.log(x[columnName], value)
            //     return x[columnName] == value;
            // })
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
            this.highlightRowNo = null;
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
            this.columns.forEach(c => { c.sorted = null; }); // reset others until multisorted funcionality
            column.sorted = "ASC";
            let page = this.currentPage;
            if (typeof(column.sortingFunction) == 'function'){
                this.sourceModified.sort(column.sortingFunction);
            } else {
                this.sourceModified.sort(this.dynamicSort(column.data, column.sortable));
            }
            this.calculateCurrentPageRowsModified();
            //this.changePage(page);
        },
        sortDesc: function (column) {
            this.columns.forEach(c => { c.sorted = null; }); // reset others until multisorted funcionality
            column.sorted = "DESC";
            let page = this.currentPage;
            if (typeof(column.sortingFunction) == 'function'){
                this.sourceModified.sort(column.sortingFunction).reverse();
            } else {
                this.sourceModified.sort(this.dynamicSort("-" + column.data, column.sortable));
            }
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
                    var result = (a[property] || '').localeCompare(b[property] || '');
                    return result * sortOrder;
                }
            }
        },
        exportData: function(){
            switch(this.exportFormat){
                case 'json': this.exportJson(); break;
                case 'csv': this.exportCsv(); break;
                case 'txt': this.exportText(); break;
            }
        },
        exportJson: function(){
            let content = []; // get rid of metadata
            let self = this;
            this.sourceModified.forEach(function(x) {
                let x_ = self.cloneObj(x, self);
                delete(x_['__index__']);
                content.push(x_);
            });
            this.download(this.exportFilename, 'application/json', JSON.stringify(content, null, 2));
        },
        exportCsv: function(){
            let separator = ';';
            let colNames = this.columnsModified.map(c => c.data);
            let content = `"sep=${separator}"\n`;
            content += this.columnsModified.map(c => c.title).join(separator) + '\n'; // header
            this.sourceModified.forEach((row) => {
                colNames.forEach((column, i) => {
                    content += escape(row[column]) + (i < colNames.length - 1 ? separator : '\n')
                })
            });

            function escape(val){
                if (!val) return '';
                if (val.toString().includes('"')){
                    val = val.replace(/\"/g,'""');
                }
                val = `"${val}"`;
                return val;
            }
            this.download(this.exportFilename, 'text/csv', content)
        },
        exportText: function(){
            let separator = '\t';
            let colNames = this.columnsModified.map(c => c.data);
            let content = this.columnsModified.map(c => c.title).join(separator) + '\n'; // header
            this.sourceModified.forEach((row) => {
                colNames.forEach((column, i) => {
                    content += (row[column] || '') + (i < colNames.length - 1 ? separator : '\n')
                })
            });
            this.download(this.exportFilename, 'text/plain', content)
        },
        download: function(filename, mimetype, content){
            const anchor = document.createElement('a');
            //anchor.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content);
            anchor.href = `data:${mimetype};charset=utf-8,${encodeURIComponent(content)}`;
            anchor.target = '_blank';
            anchor.download = filename || 'datagrid_export.txt';
            anchor.click();
        },
        getColumnsNo: function(){
            return this.columns.length + (this.showExpand ? 1 : 0) + (this.showCounter ? 1 : 0) + (this.showActions ? 1 : 0);
        },
        // deep clone
        cloneObj: function(obj, thisRef) {
            if (obj === null || typeof (obj) !== 'object' || 'isActiveClone' in obj){
                return obj;
            }
            if (obj instanceof Date){
                var temp = new Date(obj);//new obj.constructor(); //or new Date(obj);
            } else {
                var temp = obj.constructor();
            }
            for (var key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    obj['isActiveClone'] = null;
                    temp[key] = thisRef.cloneObj(obj[key]);
                    delete obj['isActiveClone'];
                }
            }
            return temp;
        }
    
    },

    template: `    
	<div class="datagrid_container">
        <div class="datagrid_header">
            <span class="pageSize">    
                Show 
                <select v-model.number="selectedPageSize">
                    <option v-for="option in pageSizeOptions">{{option}}</option>
                    <option v-if="pageSizeOptionsShowAll" value="all">All</option>
                </select> entries
            </span>

            <span class="search">Search: <input type="text" v-model="filterGeneralValue" /></span>
        </div>
        <table :class="['datagrid_table', tableClass]">
            <thead>
                <tr :class="tableHeaderClass" valign="middle">
                    <th v-if="showCounter"><!-- counter column title --></th>
                    <th v-for="(col, index) in columnsModified" :class="[{'sortable': col.sortable}]" :style="[{'width': col.width ? col.width +'px' : 'auto'},{'text-align': col.align ? col.align : 'inherit'}]" :key="index">
                        {{ col.title }}
                        <span class="sort-asc" :class="{'sorted': col.sorted != undefined, 'active': col.sorted == 'DESC'}" v-if="col.sortable" @click="sortToggle(col)"></span>
                        <span class="sort-desc" :class="{'sorted': col.sorted != undefined, 'active': col.sorted == 'ASC' || col.sorted == undefined}"  v-if="col.sortable" @click="sortToggle(col)"></span>
                    </th>
                    <th v-if="showExpand"><!-- expand column title --></th>
                    <th v-if="showActions"><!-- actions column title --></th>
                </tr>
                <tr v-if="columnFilters" class="columnFilters">
                    <th v-if="showCounter"><!-- counter column title --></th>
                    <th v-for="(col, index) in columnsModified" :key="index">
                        <select v-if="col.showColumnFilter && columnFilters[col.data] && columnFilters[col.data].options" @change="columnFilterChange(col.data)" v-model="columnFilters[col.data].value">
                            <option></option>
                            <option v-for="val in columnFilters[col.data].options" :key="val">{{val}}</option>
                        </select>
                    </th>
                    <th v-if="showExpand"><!-- expand column title --></th>
                    <th v-if="showActions"><!-- actions column title --></th>
                </tr>
            </thead>
            <tbody>
                <tr v-if="isLoading" class="loading">
                    <td :colspan="getColumnsNo()"><span>Loading...</span></td>
                </tr>
                <tr v-for="(row, rowIndex) in currentPageRowsModified" :key="row.__index__" :class="[row.expanded ? 'expanded' : '', row.type == 'details' ? 'details' : '', {'highlighted': row.__index__ == highlightRowNo}]">
                    <template v-if="row.type == 'details'">
                        <td :colspan="getColumnsNo()">
                            <slot name="details" v-bind="row"></slot>
                        </td>
                    </template>
                    <template v-else>
                        <td v-if="showCounter" class="counter">{{((currentPage -1) * pageSize) + rowIndex + 1}}</td>
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
        <div class="datagrid_footer">
            <div class="datagrid_info">
                <span class="info_page">Page {{currentPage}} of {{totalPages}}.</span>
                <span class="info_entries">Showing {{currentPageFirstItemNo}} to {{currentPageLastItemNo}} of {{totalRows}} entries</span>
            </div>
            <div class="datagrid_paging" v-show="totalPages > 1">
                <template v-for="(button, index) in pagingButtons">
                    <button :key="index" type="button" @click="changePage(button.page)" :class="['btn', currentPage == button.page ? currentPageButtonClass : '']" v-html="button.text"></button>
                </template>
            </div>
            <div class="datagrid_export" v-show="showExport">
                <span>Export as</span>
                <select v-model="exportFormat">
                    <option value="csv">csv</option>
                    <option value="json">json</option>
                    <option value="txt">txt</option>
                </select>
                <button @click="exportData" type="button" class="button">Download</button>
            </div>
        </div>
    </div>
`
};

