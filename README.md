# datagrid
Vue.js datagrid control

Run with `node server.js`

Dependencies: none

Usage example:
```
    <datagrid
        key="datagrid1"
        :source="data_source"
        :columns="data_columns"
        :is-loading="isLoading"
        :filter-general-columns="'column_data_source_names,title,company'"
        :table-class="'myTable'"
        :table-header-class="'header'"
        :title="'Countries'"
        :show-counter="true"
        :page-size-default="5"
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
        <template v-slot:no_records>
            <p>No results</p>
        </template>
    </datagrid>
```

## History
(versions with * have breaking changes)
- 1.2.2.12    Table title, No results slot
- 1.2.2.11    No results message
- 1.2.2.10    showColumnFilter
- 1.2.2.9     isLoading
- 1.2.2.8     findAndHighlight
- 1.2.2.7     Export to csv/json/txt
- 1.2.2.6*    Integrated search into component. *filter-general-value has no function now.
- 1.2.2.5*    page-size-options-show-all (true, false). *Old page-size property renamed to page-size-default
- 1.2.2.4     pageSizeOptions
- 1.2.2.3     Custom sorting function (sortingFunction)
- 1.2.2.2     Sorting icon visibility persistent when column is sorted.
