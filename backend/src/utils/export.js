function toCSV(data, columns) {
    if (!data || !data.length) return '';
    const headers = columns.map(c => '"' + c.label + '"').join(',');
    const rows    = data.map(row =>
        columns.map(c => '"' + String(row[c.key] || '').replace(/"/g, '""') + '"').join(',')
    );
    return '\uFEFF' + headers + '\n' + rows.join('\n');
}

const TRIP_COLUMNS = [
    { key: 'trip_code',        label: 'Trip Code' },
    { key: 'type',             label: 'Type' },
    { key: 'driver_name',      label: 'Driver' },
    { key: 'driver_phone',     label: 'Phone' },
    { key: 'driver_car',       label: 'Car' },
    { key: 'route_from',       label: 'From' },
    { key: 'route_to',         label: 'To' },
    { key: 'passengers_count', label: 'Passengers' },
    { key: 'fare_per_person',  label: 'Fare/Person (IQD)' },
    { key: 'total_income',     label: 'Total Income (IQD)' },
    { key: 'status',           label: 'Status' },
    { key: 'start_time',       label: 'Start Time' },
    { key: 'end_time',         label: 'End Time' },
    { key: 'created_by',       label: 'Created By' }
];

const PASSENGER_COLUMNS = [
    { key: 'id',          label: 'ID' },
    { key: 'name',        label: 'Name' },
    { key: 'passport',    label: 'Passport' },
    { key: 'nationality', label: 'Nationality' },
    { key: 'trip_code',   label: 'Trip Code' },
    { key: 'type',        label: 'Trip Type' },
    { key: 'driver_name', label: 'Driver' },
    { key: 'route_from',  label: 'From' },
    { key: 'route_to',    label: 'To' },
    { key: 'start_time',  label: 'Date' }
];

function exportTripsCSV(trips)     { return toCSV(trips, TRIP_COLUMNS); }
function exportPassengersCSV(rows) { return toCSV(rows, PASSENGER_COLUMNS); }

module.exports = { exportTripsCSV, exportPassengersCSV, toCSV };
