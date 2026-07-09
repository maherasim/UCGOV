import DataTableCore from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';

DataTableCore.use(DT);

/**
 * Themed wrapper around the official DataTables React component (see resources/css/app.css
 * for the `.uc-datatable` style overrides that reskin it to match the Punjab Govt palette).
 */
export default function DataTable({ columns, data, slots }) {
    return (
        <div className="uc-datatable">
            <DataTableCore
                key={columns.map((c) => c.title).join('|')}
                data={data}
                columns={columns}
                slots={slots}
                className="display w-full"
                options={{
                    lengthMenu: [10, 25, 50, 100],
                    pageLength: 10,
                    language: {
                        search: '',
                        searchPlaceholder: 'Search…',
                        emptyTable: 'No records yet.',
                    },
                }}
            >
                <thead>
                    <tr>
                        {columns.map((c, i) => (
                            <th key={i}>{c.title}</th>
                        ))}
                    </tr>
                </thead>
            </DataTableCore>
        </div>
    );
}
